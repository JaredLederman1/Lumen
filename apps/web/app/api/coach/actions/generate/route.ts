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
const HIGH_INTEREST_TYPES = new Set(['credit card'])
const DISCRETIONARY_CATS = new Set([
  'dining', 'restaurants', 'food and drink', 'entertainment', 'shopping',
  'travel', 'subscriptions', 'recreation', 'personal care', 'clothing',
])

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

const SYSTEM_PROMPT = `You are the Illumin Engine generating a prioritized financial action plan. Based on the user's financial data, produce 3 to 6 concrete, specific action items.

Follow this exact priority order:
1. DEFICIT: If monthly expenses exceed monthly income, this must be the first action.
2. SPENDING: If discretionary spending (dining, entertainment, subscriptions, shopping, travel) exceeds 25% of income, flag specific categories with exact numbers.
3. DEBT: If high-interest debt (credit card or above 7% APR) exists, prioritize paydown using the avalanche method.
4. INVESTMENT: If liquid cash exceeds 3 months of expenses, recommend moving excess to a money market account or a diversified equity allocation appropriate for the user's age and retirement timeline.

Rules:
- Be specific: "Reduce dining from $620/mo to $300/mo" not "reduce dining"
- Only include items relevant to the user's actual situation
- Skip any priority level if it does not apply
- category must be exactly one of: spending, debt, investment, savings

Respond with ONLY a valid JSON array. No explanation, no markdown, no other text:
[
  { "label": "...", "description": "...", "priority": 1, "category": "spending" },
  ...
]`

type ActionItem = {
  label: string
  description: string
  priority: number
  category: string
}

export async function POST() {
  try {
  const result = await requireAuth()
  if ('error' in result) return result.error
  const { user: { dbUser } } = result

  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)

  const [accounts, recentTxs, profile] = await Promise.all([
    prisma.account.findMany({ where: { userId: dbUser.id } }),
    prisma.transaction.findMany({
      where: { account: { userId: dbUser.id }, date: { gte: ninetyDaysAgo } },
      select: { amount: true, date: true, category: true },
    }),
    prisma.onboardingProfile.findUnique({ where: { userId: dbUser.id } }),
  ])

  const incomeByMonth: Record<string, number> = {}
  const expenseByMonth: Record<string, number> = {}
  const categoryTotals: Record<string, number> = {}

  for (const tx of recentTxs) {
    const key = `${new Date(tx.date).getFullYear()}-${new Date(tx.date).getMonth()}`
    if (tx.amount > 0) {
      incomeByMonth[key] = (incomeByMonth[key] ?? 0) + tx.amount
    } else {
      expenseByMonth[key] = (expenseByMonth[key] ?? 0) + Math.abs(tx.amount)
      const cat = normalizeCategory(tx.category).toLowerCase()
      categoryTotals[cat] = (categoryTotals[cat] ?? 0) + Math.abs(tx.amount)
    }
  }

  const months = Math.max(Object.keys(expenseByMonth).length, 1)
  const monthlyIncome = Object.values(incomeByMonth).reduce((s, v) => s + v, 0) /
    Math.max(Object.keys(incomeByMonth).length, 1)
  const monthlyExpenses = Object.values(expenseByMonth).reduce((s, v) => s + v, 0) / months

  const topCategories = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([cat, total]) => ({ cat, monthly: Math.round(total / months) }))

  const discretionaryTotal = Object.entries(categoryTotals)
    .filter(([cat]) => [...DISCRETIONARY_CATS].some(d => cat.includes(d)))
    .reduce((s, [, v]) => s + v / months, 0)

  const highInterestDebt = accounts
    .filter(a => HIGH_INTEREST_TYPES.has((a.accountType ?? '').toLowerCase()))
    .reduce((s, a) => s + Math.abs(a.balance), 0)

  const totalDebt = accounts
    .filter(a => a.classification === 'liability' || LIABILITY_TYPES.has((a.accountType ?? '').toLowerCase()))
    .reduce((s, a) => s + Math.abs(a.balance), 0)

  const liquidCash = accounts
    .filter(a => LIQUID_TYPES.has((a.accountType ?? '').toLowerCase()))
    .reduce((s, a) => s + a.balance, 0)

  const totalInvested = accounts
    .filter(a => INVESTMENT_TYPES.has((a.accountType ?? '').toLowerCase()))
    .reduce((s, a) => s + a.balance, 0)

  const idleCash = Math.max(0, liquidCash - monthlyExpenses * 3)

  const userMessage = `Financial data:

Monthly income: ${fmt(monthlyIncome)}
Monthly expenses: ${fmt(monthlyExpenses)}
Net monthly: ${fmt(monthlyIncome - monthlyExpenses)} (${monthlyIncome >= monthlyExpenses ? 'surplus' : 'DEFICIT'})
Discretionary spending: ${fmt(discretionaryTotal)}/mo (${monthlyIncome > 0 ? ((discretionaryTotal / monthlyIncome) * 100).toFixed(0) : 0}% of income)
High-interest debt (credit card): ${fmt(highInterestDebt)}
Total debt: ${fmt(totalDebt)}
Liquid cash: ${fmt(liquidCash)}
Idle cash (above 3-mo buffer): ${fmt(idleCash)}
Total invested: ${fmt(totalInvested)}${profile ? `
Age: ${profile.age}
Target retirement age: ${profile.retirementAge}` : ''}

Top spending categories (monthly avg):
${topCategories.map(c => `  ${c.cat}: ${fmt(c.monthly)}/mo`).join('\n')}

Generate the prioritized action plan.`

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const message = await anthropic.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
  })

  const raw = message.content.find(b => b.type === 'text')?.text ?? '[]'

  // Strip markdown code fences if present (Claude sometimes wraps JSON in ```json ... ```)
  const text = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim()

  let items: ActionItem[] = []
  try {
    const parsed = JSON.parse(text)
    if (Array.isArray(parsed)) {
      items = parsed.filter(
        (i): i is ActionItem =>
          typeof i.label === 'string' &&
          typeof i.priority === 'number' &&
          typeof i.category === 'string'
      )
    }
  } catch (err) {
    console.error('[/api/coach/actions/generate] JSON parse failed:', err, '\nRaw text:', raw)
    return Response.json({ error: 'Failed to parse engine response' }, { status: 500 })
  }

  // Replace all existing AI-generated actions for this user
  await prisma.financialAction.deleteMany({ where: { userId: dbUser.id } })

  const created = await prisma.$transaction(
    items.map(item =>
      prisma.financialAction.create({
        data: {
          userId:      dbUser.id,
          label:       item.label,
          description: item.description ?? null,
          priority:    item.priority,
          category:    item.category,
        },
      })
    )
  )

  return Response.json({ actions: created })
  } catch (err) {
    console.error('[/api/coach/actions/generate] error:', err)
    return Response.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    )
  }
}
