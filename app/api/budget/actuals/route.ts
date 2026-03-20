import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll() { return request.cookies.getAll() }, setAll() {} } },
    )
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const dbUser = await prisma.user.findUnique({ where: { email: user.email! } })
    if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

    const transactions = await prisma.transaction.findMany({
      where: {
        account: { userId: dbUser.id },
        date: { gte: monthStart, lte: monthEnd },
      },
      select: { amount: true, category: true },
    })

    const byCategory: Record<string, number> = {}
    let totalSpent = 0

    for (const tx of transactions) {
      if (tx.amount < 0) {
        const cat = tx.category ?? 'Uncategorized'
        byCategory[cat] = (byCategory[cat] ?? 0) + Math.abs(tx.amount)
        totalSpent += Math.abs(tx.amount)
      }
    }

    const actuals = Object.entries(byCategory)
      .map(([category, total]) => ({ category, total }))
      .sort((a, b) => b.total - a.total)

    const month = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

    return NextResponse.json({ actuals, totalSpent, month })
  } catch (err) {
    console.error('[budget/actuals GET]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
