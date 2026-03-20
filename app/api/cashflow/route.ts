import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { USE_MOCK_DATA, mockMonthlyData, mockSpendingByCategory } from '@/lib/data'
import { prisma } from '@/lib/prisma'

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const PALETTE = ['#B8913A','#2D6A4F','#8B4513','#4A6785','#9B7B4A','#7A6A5A']

export async function GET(request: NextRequest) {
  if (USE_MOCK_DATA) {
    return NextResponse.json({ months: mockMonthlyData, spendingByCategory: mockSpendingByCategory })
  }

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

    const since = new Date()
    since.setMonth(since.getMonth() - 6)

    const transactions = await prisma.transaction.findMany({
      where: { account: { userId: dbUser.id }, date: { gte: since } },
      orderBy: { date: 'asc' },
    })

    // Aggregate income and expenses by calendar month
    const byMonth: Record<string, { income: number; expenses: number; year: number; monthIdx: number }> = {}
    for (const tx of transactions) {
      const d = new Date(tx.date)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (!byMonth[key]) byMonth[key] = { income: 0, expenses: 0, year: d.getFullYear(), monthIdx: d.getMonth() }
      if (tx.amount > 0) {
        byMonth[key].income += tx.amount
      } else {
        byMonth[key].expenses += Math.abs(tx.amount)
      }
    }

    const months = Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, { income, expenses, year, monthIdx }]) => ({
        month: MONTH_NAMES[monthIdx],
        year,
        income: Math.round(income),
        expenses: Math.round(expenses),
        savings: Math.round(income - expenses),
      }))

    // Spending by category: outflows only, last 30 days
    const last30 = new Date()
    last30.setDate(last30.getDate() - 30)
    const byCat: Record<string, number> = {}
    for (const tx of transactions) {
      if (tx.amount >= 0) continue
      if (new Date(tx.date) < last30) continue
      const cat = tx.category ?? 'Other'
      byCat[cat] = (byCat[cat] ?? 0) + Math.abs(tx.amount)
    }
    const spendingByCategory = Object.entries(byCat)
      .sort(([, a], [, b]) => b - a)
      .map(([category, amount], i) => ({
        category,
        amount: Math.round(amount),
        color: PALETTE[i % PALETTE.length],
      }))

    return NextResponse.json({ months, spendingByCategory })
  } catch (error) {
    console.error('[cashflow]', error)
    return NextResponse.json({ error: 'Failed to compute cash flow' }, { status: 500 })
  }
}
