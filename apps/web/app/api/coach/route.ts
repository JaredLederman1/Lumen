import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { normalizeCategory } from '@/lib/categories'
import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 60

const INVESTMENT_TYPES = new Set([
  'brokerage', 'investment', '401k', 'ira', 'roth', 'roth 401k', '403b',
  '529', 'pension', 'retirement', 'sep ira', 'simple ira',
])

const LIABILITY_TYPES = new Set([
  'credit card', 'mortgage', 'student', 'auto', 'loan', 'home equity',
])

const LIQUID_TYPES = new Set(['checking', 'savings', 'money market', 'cd'])

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

const pct = (n: number) => `${(n * 100).toFixed(1)}%`

export async function POST(request: NextRequest) {
  try {
  const result = await requireAuth()
  if ('error' in result) return result.error
  const { user: { dbUser } } = result

  const body = await request.json()
  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = body.messages ?? []

  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)

  const [accounts, recentTxs, profile, nwSnapshots] = await Promise.all([
    prisma.account.findMany({
      where: { userId: dbUser.id },
      include: { holdings: { include: { security: true } } },
    }),
    prisma.transaction.findMany({
      where: {
        account: { userId: dbUser.id },
        date: { gte: ninetyDaysAgo },
      },
      orderBy: { date: 'desc' },
      take: 200,
    }),
    prisma.onboardingProfile.findUnique({
      where: { userId: dbUser.id },
    }),
    prisma.netWorthSnapshot.findMany({
      where: { userId: dbUser.id },
      orderBy: { recordedAt: 'desc' },
      take: 6,
    }),
  ])

  // Compute balances
  const totalAssets = accounts
    .filter(a => a.classification === 'asset' || !LIABILITY_TYPES.has((a.accountType ?? '').toLowerCase()))
    .reduce((s, a) => s + Math.max(a.balance, 0), 0)

  const totalLiabilities = accounts
    .filter(a => a.classification === 'liability' || LIABILITY_TYPES.has((a.accountType ?? '').toLowerCase()))
    .reduce((s, a) => s + Math.abs(a.balance), 0)

  const netWorth = totalAssets - totalLiabilities

  // Income and expenses by month
  const incomeByMonth: Record<string, number> = {}
  const expenseByMonth: Record<string, number> = {}
  const categoryTotals: Record<string, number> = {}
  const merchantTotals: Record<string, number> = {}

  for (const tx of recentTxs) {
    const key = `${new Date(tx.date).getFullYear()}-${new Date(tx.date).getMonth()}`
    if (tx.amount > 0) {
      incomeByMonth[key] = (incomeByMonth[key] ?? 0) + tx.amount
    } else {
      expenseByMonth[key] = (expenseByMonth[key] ?? 0) + Math.abs(tx.amount)
      const cat = normalizeCategory(tx.category)
      categoryTotals[cat] = (categoryTotals[cat] ?? 0) + Math.abs(tx.amount)
      if (tx.merchantName) {
        merchantTotals[tx.merchantName] = (merchantTotals[tx.merchantName] ?? 0) + Math.abs(tx.amount)
      }
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
    .slice(0, 5)
    .map(([category, total]) => ({
      category,
      total: Math.round(total / Math.max(Object.keys(expenseByMonth).length, 1)),
    }))

  const topMerchants = Object.entries(merchantTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([merchant, total]) => ({ merchant, total: Math.round(total) }))

  const investmentAccounts = accounts.filter(a =>
    INVESTMENT_TYPES.has((a.accountType ?? '').toLowerCase())
  )
  const totalInvested = investmentAccounts.reduce((s, a) => s + a.balance, 0)

  const liquidCash = accounts
    .filter(a => LIQUID_TYPES.has((a.accountType ?? '').toLowerCase()))
    .reduce((s, a) => s + a.balance, 0)
  const idleCash = Math.max(0, liquidCash - monthlyExpenses * 3)
  const opportunityCost = idleCash * 0.07

  const netWorthTrend = nwSnapshots.length >= 2
    ? nwSnapshots[0].totalAssets - nwSnapshots[0].totalLiabilities -
      (nwSnapshots[nwSnapshots.length - 1].totalAssets - nwSnapshots[nwSnapshots.length - 1].totalLiabilities)
    : null

  const monthlySavings = monthlyIncome - monthlyExpenses
  const savingsRate = monthlyIncome > 0 ? monthlySavings / monthlyIncome : 0

  // Build all holdings sorted by value for top 5
  const allHoldings = accounts.flatMap(a => a.holdings).sort((a, b) => b.value - a.value).slice(0, 5)

  const systemPrompt = `You are the Illumin Engine, a financial analysis system embedded in the Illumin wealth management platform. You have access to the user's complete financial picture and respond as a knowledgeable, direct advisor who treats users as intelligent adults.

You are NOT a general-purpose assistant. You only answer questions about personal finance, the user's financial data, investment concepts, budgeting strategies, and wealth building. If asked about anything unrelated to finance, politely redirect.

Your tone is direct, specific, and institutional. No filler phrases. No excessive encouragement. No em dashes. Never refer to yourself as Claude, an AI, or a chatbot. You are the Illumin Engine.

When referencing numbers, always use the user's actual data below. Be specific. "Your dining spending" not "dining spending in general."

Here is the user's current financial picture:

NET WORTH
  Total assets: ${fmt(totalAssets)}
  Total liabilities: ${fmt(totalLiabilities)}
  Net worth: ${fmt(netWorth)}${netWorthTrend !== null ? `\n  Trend (last ${nwSnapshots.length} snapshots): ${netWorthTrend >= 0 ? '+' : ''}${fmt(netWorthTrend)}` : ''}

INCOME AND SPENDING (last 90 days)
  Average monthly income: ${fmt(monthlyIncome)}
  Average monthly expenses: ${fmt(monthlyExpenses)}
  Average monthly savings: ${fmt(monthlySavings)}
  Savings rate: ${pct(savingsRate)}

TOP SPENDING CATEGORIES
${topCategories.length > 0
  ? topCategories.map(c => `  ${c.category}: ${fmt(c.total)}/mo`).join('\n')
  : '  No category data available'}

TOP MERCHANTS
${topMerchants.length > 0
  ? topMerchants.map(m => `  ${m.merchant}: ${fmt(m.total)} over 90 days`).join('\n')
  : '  No merchant data available'}

ACCOUNTS
${accounts.length > 0
  ? accounts.map(a => `  ${a.institutionName} ${a.accountType} (${a.classification}): ${fmt(a.balance)}`).join('\n')
  : '  No accounts linked'}

INVESTMENTS
  Total invested: ${fmt(totalInvested)}${allHoldings.length > 0
  ? '\n  Top holdings:\n' + allHoldings.map(h => `    ${h.security.name}${h.security.ticker ? ` (${h.security.ticker})` : ''}: ${fmt(h.value)}`).join('\n')
  : ''}

IDLE CASH
  Liquid cash above emergency buffer: ${fmt(idleCash)}
  Estimated annual opportunity cost: ${fmt(opportunityCost)}
${profile ? `
PROFILE
  Age: ${profile.age}
  Annual income (self-reported): ${fmt(profile.annualIncome)}
  Savings rate target: ${(profile.savingsRate * 100).toFixed(0)}%
  Target retirement age: ${profile.retirementAge}` : ''}

You have deep knowledge of personal finance. When the user asks a question, answer it with specific reference to their data above. Always be concrete. If you recommend an action, say exactly what it is and why it applies to their situation.

Keep responses concise: 3 to 5 sentences for simple questions, up to 8 sentences for complex ones. Never use bullet points unless listing more than 4 distinct items. No markdown headers. Plain paragraphs only.

PORTFOLIO UNIT CONSISTENCY RULE: When answering questions about portfolio performance, apply strict unit consistency. Never compare a dollar amount to a percentage in the same sentence. If the user asks how much they made, answer in dollars. If they ask how they performed, answer in percentages. If they ask both, give two separate clearly labeled answers. Never say "you made $X while the market returned Y%" - this is a unit error. Say instead "your portfolio returned X% while the market returned Y%" OR "your gain was $X, versus a market-equivalent gain of $Y on the same starting value."

INVESTMENT GUARDRAILS (strict):
- Never recommend selling specific positions the user holds. You may discuss general rebalancing principles but must not say "sell [specific holding]."
- Never recommend buying specific individual equities, options, or sector ETFs. You may recommend broad, diversified index funds (e.g. total market index, total international index, total bond index) as a general strategy.
- If you mention any specific fund or index by name, append: "(Illumin has no affiliation with or sponsorship from any fund provider.)"
- You may discuss asset allocation percentages, contribution strategies, tax-advantaged account usage, and general investment principles freely.
- If the user asks you to pick stocks or recommend a specific equity trade, decline and explain that the engine provides strategic guidance, not individual trade recommendations.

DISCLAIMER RULE: When your response includes any forward-looking statement, projection, or investment-related recommendation, end your response with the following line on its own: "This is informational only, not financial advice. Past performance does not guarantee future results."

NUMBERED LIST FORMATTING: When your response contains actionable recommendations, format them as a numbered list. Each item must be a single concrete action the user can take, written in plain English, starting with a verb. Maximum 12 words per item. Do not use em dashes or bullet points in these items. Place the numbered list at the end of your response, after any explanatory prose. If a disclaimer is required, place it after the numbered list.`

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const aiStream = anthropic.messages.stream({
          model: 'claude-opus-4-5',
          max_tokens: 1024,
          system: systemPrompt,
          messages,
        })

        for await (const chunk of aiStream) {
          if (
            chunk.type === 'content_block_delta' &&
            chunk.delta.type === 'text_delta'
          ) {
            controller.enqueue(encoder.encode(chunk.delta.text))
          }
        }
      } catch (err) {
        controller.enqueue(
          encoder.encode(`\n[Error: ${err instanceof Error ? err.message : 'Stream failed'}]`)
        )
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
  } catch (err) {
    console.error('[/api/coach] error:', err)
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Internal error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
