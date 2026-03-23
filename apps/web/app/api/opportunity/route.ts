import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { prisma } from '@/lib/prisma'

const LIQUID_TYPES = new Set(['checking', 'savings', 'money market', 'cd'])

export interface ProjectionPoint {
  year: number
  withInvestment: number
  withoutInvestment: number
}

export interface OpportunityData {
  idleCash: number
  oneYearCost: number
  fiveYearCost: number
  tenYearCost: number
  projectionSeries: ProjectionPoint[]
  age: number
  retirementAge: number
  savingsRate: number | null
  annualIncome: number | null
  monthlySavingsAmount: number | null
  hasOnboardingProfile: boolean
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

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

    const { data: { user: authUser } } = token
      ? await supabase.auth.getUser(token)
      : await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const dbUser = await prisma.user.findUnique({ where: { email: authUser.email! } })
    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const threeMonthsAgo = new Date()
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)

    const [accounts, profile, recentTransactions] = await Promise.all([
      prisma.account.findMany({ where: { userId: dbUser.id } }),
      prisma.onboardingProfile.findUnique({ where: { userId: dbUser.id } }),
      prisma.transaction.findMany({
        where: {
          account: { userId: dbUser.id },
          date: { gte: threeMonthsAgo },
          amount: { lt: 0 },
        },
      }),
    ])

    // Idle cash: liquid balances above a 3-month emergency buffer
    const liquidAccounts = accounts.filter(a =>
      LIQUID_TYPES.has((a.accountType ?? '').toLowerCase())
    )
    const totalLiquid = liquidAccounts.reduce((s, a) => s + a.balance, 0)

    const totalExpenses = recentTransactions.reduce((s, t) => s + Math.abs(t.amount), 0)
    const monthlyExpenses = totalExpenses / 3
    const emergencyBuffer = monthlyExpenses * 3

    const idleCash = Math.max(0, totalLiquid - emergencyBuffer)

    // Opportunity cost at 7% historical S&P 500 real return
    const oneYearCost = idleCash * 0.07
    const fiveYearCost = idleCash * (Math.pow(1.07, 5) - 1)
    const tenYearCost = idleCash * (Math.pow(1.07, 10) - 1)

    const age = profile?.age ?? 30
    const retirementAge = profile?.retirementAge ?? 65
    const yearsToRetirement = Math.max(1, retirementAge - age)

    // Project from current age to retirement: invested at 7% vs idle at 2%
    const projectionSeries: ProjectionPoint[] = Array.from({ length: yearsToRetirement }, (_, i) => {
      const year = i + 1
      return {
        year,
        withInvestment: idleCash * Math.pow(1.07, year),
        withoutInvestment: idleCash * Math.pow(1.02, year),
      }
    })

    const savingsRate = profile?.savingsRate ?? null
    const annualIncome = profile?.annualIncome ?? null
    const monthlySavingsAmount =
      savingsRate !== null && annualIncome !== null
        ? (annualIncome * savingsRate) / 12
        : null

    const payload: OpportunityData = {
      idleCash,
      oneYearCost,
      fiveYearCost,
      tenYearCost,
      projectionSeries,
      age,
      retirementAge,
      savingsRate,
      annualIncome,
      monthlySavingsAmount,
      hasOnboardingProfile: !!profile,
    }

    return NextResponse.json(payload)
  } catch (error) {
    console.error('[opportunity]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
