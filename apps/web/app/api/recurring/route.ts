import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { prisma } from '@/lib/prisma'
import { normalizeCategory } from '@/lib/categories'

export interface RecurringCharge {
  date: string
  amount: number
}

export interface RecurringMerchant {
  name: string
  occurrences: number
  lastAmount: number
  lastDate: string
  averageAmount: number
  frequency: 'monthly' | 'irregular'
  category: string | null
  totalSpent: number
  charges: RecurringCharge[]
  nextExpectedDate: string | null
}

// A merchant is "monthly" if it appears in at least 70% of the calendar months
// between its first and last transaction. Otherwise it is "irregular".
function detectFrequency(dates: Date[]): 'monthly' | 'irregular' {
  if (dates.length < 2) return 'irregular'
  const months = new Set(dates.map(d => d.toISOString().slice(0, 7)))
  const sorted = [...dates].sort((a, b) => a.getTime() - b.getTime())
  const first = sorted[0]
  const last = sorted[sorted.length - 1]
  const totalMonths =
    (last.getFullYear() - first.getFullYear()) * 12 +
    (last.getMonth() - first.getMonth()) +
    1
  return months.size / totalMonths >= 0.7 ? 'monthly' : 'irregular'
}

/**
 * Predict the next charge date based on observed intervals.
 * For monthly charges, uses the median day-of-month from past charges.
 * For irregular charges, adds the average interval to the most recent date.
 */
function predictNextDate(dates: Date[], frequency: 'monthly' | 'irregular'): Date | null {
  if (dates.length < 2) return null
  const sorted = [...dates].sort((a, b) => a.getTime() - b.getTime())
  const mostRecent = sorted[sorted.length - 1]

  if (frequency === 'monthly') {
    // Use the median day-of-month for consistency
    const days = sorted.map(d => d.getDate()).sort((a, b) => a - b)
    const medianDay = days[Math.floor(days.length / 2)]
    // Next month from the most recent charge
    const next = new Date(mostRecent)
    next.setMonth(next.getMonth() + 1)
    // Clamp the day to the last day of that month
    const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()
    next.setDate(Math.min(medianDay, lastDay))
    return next
  }

  // Irregular: compute average interval in ms and project forward
  const intervals: number[] = []
  for (let i = 1; i < sorted.length; i++) {
    intervals.push(sorted[i].getTime() - sorted[i - 1].getTime())
  }
  const avgInterval = intervals.reduce((s, v) => s + v, 0) / intervals.length
  return new Date(mostRecent.getTime() + avgInterval)
}

export async function GET(request: NextRequest) {
  try {
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

    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const dbUser = await prisma.user.findUnique({ where: { email: authUser.email! } })
    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const transactions = await prisma.transaction.findMany({
      where: { account: { userId: dbUser.id } },
      include: { account: true },
      orderBy: { date: 'desc' },
    })

    // Fetch excluded merchants
    const exclusions = await prisma.recurringExclusion.findMany({
      where: { userId: dbUser.id },
      select: { merchantName: true },
    })
    const excludedSet = new Set(exclusions.map(e => e.merchantName.trim().toLowerCase()))

    // Group by merchant name, case-insensitive and trimmed
    const merchantMap = new Map<string, typeof transactions>()
    for (const tx of transactions) {
      if (!tx.merchantName) continue
      const key = tx.merchantName.trim().toLowerCase()
      if (excludedSet.has(key)) continue
      if (!merchantMap.has(key)) merchantMap.set(key, [])
      merchantMap.get(key)!.push(tx)
    }

    const recurring: RecurringMerchant[] = []

    for (const [, txs] of merchantMap) {
      // Require appearances in at least 2 distinct calendar months (same logic as detectRecurringMerchants)
      const months = new Set(txs.map(t => {
        const d = t.date instanceof Date ? t.date : new Date(t.date)
        return d.toISOString().slice(0, 7)
      }))
      if (months.size < 2) continue

      // txs are already ordered desc by date from the query
      const mostRecent = txs[0]
      const name = mostRecent.merchantName!.trim()
      const occurrences = txs.length
      const lastAmount = mostRecent.amount
      const lastDate = (mostRecent.date instanceof Date ? mostRecent.date : new Date(mostRecent.date)).toISOString()
      const averageAmount = txs.reduce((s, t) => s + t.amount, 0) / txs.length
      const totalSpent = txs.filter(t => t.amount < 0).reduce((s, t) => s + t.amount, 0)

      // Only keep expense merchants
      if (totalSpent >= 0) continue

      const category = normalizeCategory(mostRecent.category)
      const dates = txs.map(t => t.date instanceof Date ? t.date : new Date(t.date))
      const frequency = detectFrequency(dates)

      const charges: RecurringCharge[] = txs.map(t => ({
        date: (t.date instanceof Date ? t.date : new Date(t.date)).toISOString(),
        amount: t.amount,
      }))

      const predicted = predictNextDate(dates, frequency)
      const nextExpectedDate = predicted ? predicted.toISOString() : null

      recurring.push({ name, occurrences, lastAmount, lastDate, averageAmount, frequency, category, totalSpent, charges, nextExpectedDate })
    }

    // Sort by absolute value of last amount, descending
    recurring.sort((a, b) => Math.abs(b.lastAmount) - Math.abs(a.lastAmount))

    const totalMonthlyEstimate = recurring
      .filter(r => r.frequency === 'monthly')
      .reduce((s, r) => s + r.lastAmount, 0)

    return NextResponse.json({
      recurring,
      totalMonthlyEstimate,
      totalCount: recurring.length,
    })
  } catch (error) {
    console.error('[recurring]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
