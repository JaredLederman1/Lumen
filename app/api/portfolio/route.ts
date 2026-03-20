import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { prisma } from '@/lib/prisma'

const INVESTMENT_TYPES = new Set([
  'brokerage', 'investment', '401k', '403b', 'ira', 'roth', 'roth 401k', '529',
  'pension', 'retirement', 'ugma', 'utma', 'keogh', 'profit sharing plan',
  'money purchase plan', 'simple ira', 'sep ira',
])

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

    const allAccounts = await prisma.account.findMany({
      where: { userId: dbUser.id },
      orderBy: { createdAt: 'desc' },
    })

    const accounts = allAccounts.filter(a =>
      INVESTMENT_TYPES.has((a.accountType ?? '').toLowerCase())
    )

    const totalValue = accounts.reduce((sum, a) => sum + a.balance, 0)

    const byType: Record<string, number> = {}
    for (const a of accounts) {
      const key = a.accountType ?? 'other'
      byType[key] = (byType[key] ?? 0) + a.balance
    }

    const allocationByType = Object.entries(byType).map(([label, value]) => ({
      label,
      value,
      percentage: totalValue > 0 ? (value / totalValue) * 100 : 0,
    }))

    return NextResponse.json({
      accounts,
      totalValue,
      allocationByType,
      hasInvestments: accounts.length > 0,
    })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch portfolio' }, { status: 500 })
  }
}
