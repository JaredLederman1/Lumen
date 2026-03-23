import { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '@/lib/prisma'
import { sanitizeForPrompt, wrapUserData, DATA_PREAMBLE } from '@/lib/sanitize'
import { rateLimiter, getRateLimitKey } from '@/lib/rateLimit'
import { BUDGET_CATEGORIES, normalizeCategory } from '@/lib/categories'

export const maxDuration = 60

const INVESTMENT_TYPES = new Set([
  'brokerage', 'investment', '401k', 'ira', 'roth', 'roth 401k', '403b',
  '529', 'pension', 'retirement', 'sep ira', 'simple ira',
])

const LIABILITY_TYPES = new Set([
  'credit card', 'mortgage', 'student', 'auto', 'loan', 'home equity',
])

const LIQUID_TYPES = new Set(['checking', 'savings', 'money market', 'cd'])

async function getUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
    const { data: { user } } = await supabase.auth.getUser(authHeader.slice(7))
    if (user) return user
  }
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return request.cookies.getAll() }, setAll() {} } },
  )
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

const SYSTEM_PROMPT = `You are a personal financial advisor embedded in Illumin, a wealth management platform. Your role is to analyze a user's complete financial picture and recommend the single best budgeting strategy for their situation.

You have deep knowledge of exactly 7 budgeting strategies. You may only recommend one of these 7. Never invent or suggest a different approach.

The 7 strategies are:

1. 50/30/20 Rule
   Allocate 50% of take-home income to needs (rent, groceries, utilities, insurance, minimum debt payments), 30% to wants (dining, entertainment, subscriptions, travel), 20% to savings and extra debt payments.
   Best for: stable income earners new to budgeting, people who find zero-based budgeting too rigid, solid foundation for most situations.

2. Zero-Based Budgeting
   Every dollar of income is assigned a specific job. Income minus all allocations equals zero. Requires tracking every category actively.
   Best for: detail-oriented users, people with variable or impulse spending they want to control, anyone in active debt paydown mode.

3. Pay Yourself First
   Immediately allocate a fixed savings contribution the moment income arrives, before any other spending. Spend the remainder freely with no category tracking required.
   Best for: high earners with solid baseline discipline, people who consistently overspend discretionary but have room in their income, users who find budgeting demotivating but want to build wealth.

4. Envelope Method
   Divide spending into fixed categories with hard cash limits. When an envelope is empty, spending in that category stops for the month.
   Best for: users with specific chronic overspending categories, people who need hard stops rather than soft suggestions.

5. Values-Based Budgeting
   Identify 3 to 5 core spending priorities that matter most. Maximize those unapologetically. Cut everything outside them aggressively.
   Best for: users with clear defined financial goals, higher income earners optimizing for a specific outcome like a house or early retirement.

6. Anti-Budget
   Automate all savings contributions and bill payments. Everything remaining after automation is fully guilt-free spending with no tracking required.
   Best for: high income users with low debt, financially disciplined people who find traditional budgeting demotivating or patronizing.

7. Debt Avalanche
   Pay minimums on all debts. Direct every available dollar beyond minimums to the highest interest rate debt first. Savings contributions are minimal until high-interest debt is eliminated.
   Best for: users carrying significant high-interest debt where the interest rate exceeds expected investment returns, typically above 7%.

Your response must follow this exact structure:

SECTION 1: A 2 to 3 sentence assessment of the user's current financial situation. Be specific, reference their actual numbers. Be direct, not sycophantic. Do not start with "Great news" or similar filler.

SECTION 2: Your strategy recommendation. State the strategy name clearly, then explain in 3 to 4 sentences exactly why it fits this user's specific situation. Reference their income, debt, savings rate, or spending patterns directly.

SECTION 3: A JSON block containing the suggested monthly budget allocations. This must be the last thing in your response, formatted exactly like this with no additional text after it:

BUDGET_JSON_START
{
  "strategy": "<strategy name>",
  "monthlyIncome": <number>,
  "categories": [
    { "name": "<category>", "amount": <number>, "type": "need|want|saving|debt" },
    ...
  ]
}
BUDGET_JSON_END

Category names in the JSON MUST use only these exact canonical names: ${BUDGET_CATEGORIES.join(', ')}. Do not invent new category names. Map the user's spending into these categories. Always include at least: Housing and Utilities, Groceries, Transport, Savings. All amounts should sum to approximately monthlyIncome. Amounts are monthly dollar figures.

Keep your tone institutional and direct. No em dashes. No filler phrases. No markdown headers. Write in plain paragraphs.`

export async function POST(request: NextRequest) {
  const limitKey = await getRateLimitKey(request)
  const limit = rateLimiter('ai', limitKey)
  if (!limit.allowed) return limit.response

  const authUser = await getUser(request)
  if (!authUser) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  const dbUser = await prisma.user.findUnique({ where: { email: authUser.email! } })
  if (!dbUser) {
    return new Response(JSON.stringify({ error: 'User not found' }), { status: 404 })
  }

  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

  const [accounts, recentTxns, profile] = await Promise.all([
    prisma.account.findMany({ where: { userId: dbUser.id } }),
    prisma.transaction.findMany({
      where: { account: { userId: dbUser.id }, date: { gte: ninetyDaysAgo } },
      select: { amount: true, date: true, category: true },
    }),
    prisma.onboardingProfile.findUnique({ where: { userId: dbUser.id } }),
  ])

  // Group transactions by month to compute averages
  const incomeByMonth: Record<string, number> = {}
  const expenseByMonth: Record<string, number> = {}
  const categoryTotals: Record<string, number> = {}

  for (const tx of recentTxns) {
    const key = `${new Date(tx.date).getFullYear()}-${new Date(tx.date).getMonth()}`
    if (tx.amount > 0) {
      incomeByMonth[key] = (incomeByMonth[key] ?? 0) + tx.amount
    } else {
      expenseByMonth[key] = (expenseByMonth[key] ?? 0) + Math.abs(tx.amount)
      const cat = normalizeCategory(tx.category)
      categoryTotals[cat] = (categoryTotals[cat] ?? 0) + Math.abs(tx.amount)
    }
  }

  const incomeMonths = Object.values(incomeByMonth)
  const expenseMonths = Object.values(expenseByMonth)
  const monthlyIncome = incomeMonths.length > 0
    ? incomeMonths.reduce((s, v) => s + v, 0) / incomeMonths.length
    : 0
  const monthlyExpenses = expenseMonths.length > 0
    ? expenseMonths.reduce((s, v) => s + v, 0) / expenseMonths.length
    : 0

  const topCategories = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([category, total]) => ({
      category: sanitizeForPrompt(category, { maxLength: 50, fieldName: 'category' }),
      monthlyAvg: Math.round(total / Math.max(Object.keys(expenseByMonth).length, 1)),
    }))

  const totalDebt = accounts
    .filter(a => a.classification === 'liability' || LIABILITY_TYPES.has((a.accountType ?? '').toLowerCase()))
    .reduce((s, a) => s + Math.abs(a.balance), 0)

  const totalInvestments = accounts
    .filter(a => INVESTMENT_TYPES.has((a.accountType ?? '').toLowerCase()))
    .reduce((s, a) => s + a.balance, 0)

  const totalLiquid = accounts
    .filter(a => LIQUID_TYPES.has((a.accountType ?? '').toLowerCase()))
    .reduce((s, a) => s + a.balance, 0)

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

  const profileLines = profile
    ? [
        `Age: ${profile.age}`,
        `Annual income (self-reported): ${fmt(profile.annualIncome)}`,
        `Savings rate target: ${(profile.savingsRate * 100).toFixed(0)}%`,
        `Target retirement age: ${profile.retirementAge}`,
      ].join('\n')
    : ''

  const categoryLines = topCategories.length > 0
    ? topCategories.map(c => `  ${c.category}: ${fmt(c.monthlyAvg)}/mo`).join('\n')
    : '  No category data available'

  const financialData = `Monthly income: ${fmt(monthlyIncome)}
Monthly expenses: ${fmt(monthlyExpenses)}
Total debt: ${fmt(totalDebt)}
Total investments: ${fmt(totalInvestments)}
Liquid cash: ${fmt(totalLiquid)}${profileLines ? '\n' + profileLines : ''}

Top spending categories (monthly average):
${categoryLines}`

  const userMessage = `${DATA_PREAMBLE}

${wrapUserData('financial_data', financialData)}

Please analyze my situation and recommend the best budgeting strategy.`

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const aiStream = anthropic.messages.stream({
          model: 'claude-opus-4-5',
          max_tokens: 1024,
          system: SYSTEM_PROMPT,
          messages: [{ role: 'user', content: userMessage }],
        })

        for await (const chunk of aiStream) {
          if (
            chunk.type === 'content_block_delta' &&
            chunk.delta.type === 'text_delta'
          ) {
            controller.enqueue(
              encoder.encode(
                JSON.stringify({ type: 'delta', text: chunk.delta.text }) + '\n'
              )
            )
          }
        }

        controller.enqueue(
          encoder.encode(JSON.stringify({ type: 'done' }) + '\n')
        )
      } catch (err) {
        controller.enqueue(
          encoder.encode(
            JSON.stringify({
              type: 'error',
              error: err instanceof Error ? err.message : 'Stream failed',
            }) + '\n'
          )
        )
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
