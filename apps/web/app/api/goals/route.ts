import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { prisma } from '@/lib/prisma'

const INVESTMENT_TYPES = new Set([
  'brokerage', 'investment', '401k', '403b', 'ira', 'roth', 'roth 401k', '529',
  'pension', 'retirement', 'ugma', 'utma', 'keogh', 'profit sharing plan',
  'money purchase plan', 'simple ira', 'sep ira',
])

const LIABILITY_TYPES = new Set([
  'credit card', 'mortgage', 'student', 'auto', 'loan', 'home equity',
])

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
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll() {},
      },
    }
  )
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function GET(request: NextRequest) {
  try {
    const authUser = await getUser(request)
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const dbUser = await prisma.user.findUnique({ where: { email: authUser.email! } })
    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const threeMonthsAgo = new Date()
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)

    const [accounts, recentTransactions, profile] = await Promise.all([
      prisma.account.findMany({ where: { userId: dbUser.id } }),
      prisma.transaction.findMany({
        where: {
          account: { userId: dbUser.id },
          date: { gte: threeMonthsAgo },
        },
        select: { amount: true, date: true },
      }),
      prisma.onboardingProfile.findUnique({ where: { userId: dbUser.id } }),
    ])

    // Group negative transactions by month to get average monthly expenses
    const expensesByMonth: Record<string, number> = {}
    for (const tx of recentTransactions) {
      if (tx.amount < 0) {
        const key = `${new Date(tx.date).getFullYear()}-${new Date(tx.date).getMonth()}`
        expensesByMonth[key] = (expensesByMonth[key] ?? 0) + Math.abs(tx.amount)
      }
    }
    const monthKeys = Object.keys(expensesByMonth)
    const avgMonthlyExpenses = monthKeys.length > 0
      ? Object.values(expensesByMonth).reduce((s, v) => s + v, 0) / monthKeys.length
      : 0

    const goals: Array<{
      id: string
      name: string
      description: string
      target: number
      current: number
      percentage: number
      monthsToTarget: number | null
      monthlyContributionNeeded: number | null
    }> = []

    // Emergency Fund
    const liquidBalance = accounts
      .filter(a => a.accountType === 'checking' || a.accountType === 'savings')
      .reduce((s, a) => s + a.balance, 0)
    const emergencyTarget = avgMonthlyExpenses * 6

    if (emergencyTarget > 0) {
      const current = Math.max(0, liquidBalance)
      const gap = Math.max(0, emergencyTarget - current)
      const percentage = Math.min(100, emergencyTarget > 0 ? (current / emergencyTarget) * 100 : 0)
      const monthlyNeeded = gap > 0 ? gap / 12 : 0

      goals.push({
        id: 'emergency-fund',
        name: 'Emergency Fund',
        description: '6 months of expenses held in liquid accounts for unexpected costs.',
        target: emergencyTarget,
        current,
        percentage,
        monthsToTarget: gap > 0 && monthlyNeeded > 0 ? Math.ceil(gap / monthlyNeeded) : 0,
        monthlyContributionNeeded: gap > 0 ? monthlyNeeded : null,
      })
    }

    // Debt Elimination
    const liabilityAccounts = accounts.filter(a =>
      a.classification === 'liability' || LIABILITY_TYPES.has((a.accountType ?? '').toLowerCase())
    )
    if (liabilityAccounts.length > 0) {
      const debtTarget = liabilityAccounts.reduce((s, a) => s + Math.abs(a.balance), 0)
      goals.push({
        id: 'debt-elimination',
        name: 'Debt Elimination',
        description: 'Pay off all outstanding balances across credit cards, loans, and other liabilities.',
        target: debtTarget,
        current: 0,
        percentage: 0,
        monthsToTarget: null,
        monthlyContributionNeeded: null,
      })
    }

    // Investment Growth
    if (profile) {
      const investmentBalance = accounts
        .filter(a => INVESTMENT_TYPES.has((a.accountType ?? '').toLowerCase()))
        .reduce((s, a) => s + a.balance, 0)
      const investTarget = profile.annualIncome * 10
      const percentage = Math.min(100, investTarget > 0 ? (investmentBalance / investTarget) * 100 : 0)
      const gap = Math.max(0, investTarget - investmentBalance)
      const yearsToRetirement = Math.max(1, profile.retirementAge - profile.age)
      const monthsToRetirement = yearsToRetirement * 12
      const monthlyNeeded = gap > 0 ? gap / monthsToRetirement : null

      goals.push({
        id: 'investment-growth',
        name: 'Investment Growth',
        description: `Build a retirement nest egg of 10x your annual income by age ${profile.retirementAge}.`,
        target: investTarget,
        current: investmentBalance,
        percentage,
        monthsToTarget: gap > 0 ? monthsToRetirement : 0,
        monthlyContributionNeeded: monthlyNeeded,
      })
    }

    return NextResponse.json({ goals, hasOnboardingProfile: !!profile })
  } catch (error) {
    console.error('[goals GET]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
