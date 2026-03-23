import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { prisma } from '@/lib/prisma'
import { normalizeCategory } from '@/lib/categories'

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

// GET /api/budget/rollover?year=2025&month=6
// Returns rollover credits for each category for the given month
export async function GET(request: NextRequest) {
  try {
    const authUser = await getUser(request)
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const dbUser = await prisma.user.findUnique({ where: { email: authUser.email! } })
    if (!dbUser) return NextResponse.json({ rollovers: [] })

    const { searchParams } = request.nextUrl
    const now = new Date()
    const year = parseInt(searchParams.get('year') ?? String(now.getFullYear()))
    const month = parseInt(searchParams.get('month') ?? String(now.getMonth() + 1))

    const rollovers = await prisma.budgetRollover.findMany({
      where: { userId: dbUser.id, periodYear: year, periodMonth: month },
    })

    return NextResponse.json({ rollovers })
  } catch (err) {
    console.error('[budget/rollover GET]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/budget/rollover
// Called at month-end to compute and store rollover amounts
// Body: { year: number, month: number }
// Computes actual spend for that month vs budget, stores the delta per category
export async function POST(request: NextRequest) {
  try {
    const authUser = await getUser(request)
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const dbUser = await prisma.user.findUnique({ where: { email: authUser.email! } })
    if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const body = await request.json()
    const { year, month } = body as { year: number; month: number }

    const budget = await prisma.budget.findUnique({ where: { userId: dbUser.id } })
    if (!budget) return NextResponse.json({ error: 'No budget found' }, { status: 404 })

    const categories = budget.categories as Array<{ name: string; amount: number; type: string }>

    const monthStart = new Date(year, month - 1, 1)
    const monthEnd = new Date(year, month, 0, 23, 59, 59, 999)

    const transactions = await prisma.transaction.findMany({
      where: {
        account: { userId: dbUser.id },
        date: { gte: monthStart, lte: monthEnd },
        amount: { lt: 0 },
      },
      select: { amount: true, category: true },
    })

    // Sum actual spend per category (match on category name, case-insensitive)
    const spendMap: Record<string, number> = {}
    for (const tx of transactions) {
      const cat = normalizeCategory(tx.category).toLowerCase()
      spendMap[cat] = (spendMap[cat] ?? 0) + Math.abs(tx.amount)
    }

    const rollovers = []
    for (const cat of categories) {
      const spent = spendMap[cat.name.toLowerCase()] ?? 0
      // Positive rollover = underspent (credit). Negative = overspent (no credit carried forward).
      const rollover = Math.max(0, cat.amount - spent)

      const record = await prisma.budgetRollover.upsert({
        where: {
          userId_categoryName_periodYear_periodMonth: {
            userId: dbUser.id,
            categoryName: cat.name,
            periodYear: year,
            periodMonth: month,
          },
        },
        create: {
          userId: dbUser.id,
          categoryName: cat.name,
          periodYear: year,
          periodMonth: month,
          budgeted: cat.amount,
          spent,
          rollover,
        },
        update: { budgeted: cat.amount, spent, rollover },
      })
      rollovers.push(record)
    }

    return NextResponse.json({ rollovers })
  } catch (err) {
    console.error('[budget/rollover POST]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
