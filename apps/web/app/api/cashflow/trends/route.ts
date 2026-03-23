import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { USE_MOCK_DATA } from '@/lib/data'
import { prisma } from '@/lib/prisma'
import { normalizeCategory } from '@/lib/categories'

export async function GET() {
  if (USE_MOCK_DATA) {
    return NextResponse.json({ categoryTrends: [], allMonthKeys: [], monthCount: 0 })
  }

  try {
    const result = await requireAuth()
    if ('error' in result) return result.error
    const { user: { dbUser } } = result

    const since = new Date()
    since.setMonth(since.getMonth() - 6)

    const transactions = await prisma.transaction.findMany({
      where: {
        account: { userId: dbUser.id },
        date: { gte: since },
        amount: { lt: 0 },
        pending: false,
      },
      orderBy: { date: 'asc' },
    })

    // Build month-by-category map
    const catMonthMap: Record<string, Record<string, number>> = {}

    for (const tx of transactions) {
      const d = new Date(tx.date)
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const category = normalizeCategory(tx.category)
      if (!catMonthMap[category]) catMonthMap[category] = {}
      catMonthMap[category][monthKey] = (catMonthMap[category][monthKey] ?? 0) + Math.abs(tx.amount)
    }

    // Build the canonical 6-month key list for the window
    const allMonthKeys: string[] = []
    const now = new Date()
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      allMonthKeys.push(key)
    }

    // Build categoryTrends
    const categoryTrends = Object.entries(catMonthMap)
      .filter(([, monthMap]) => Object.keys(monthMap).length >= 2)
      .map(([name, monthMap]) => {
        const monthlyAmounts = allMonthKeys.map(key => ({
          key,
          amount: Math.round(monthMap[key] ?? 0),
        }))

        const nonZeroMonths = monthlyAmounts.filter(m => m.amount > 0)
        const totalSpent = nonZeroMonths.reduce((sum, m) => sum + m.amount, 0)
        const avgMonthly = nonZeroMonths.length > 0 ? totalSpent / nonZeroMonths.length : 0

        // Compare last 2 months avg vs prior 2 months avg
        const last2 = monthlyAmounts.slice(-2).map(m => m.amount)
        const prior2 = monthlyAmounts.slice(-4, -2).map(m => m.amount)
        const last2avg = last2.reduce((a, b) => a + b, 0) / Math.max(last2.length, 1)
        const prior2avg = prior2.reduce((a, b) => a + b, 0) / Math.max(prior2.length, 1)

        let trend: 'up' | 'down' | 'stable' = 'stable'
        let changePercent = 0
        if (prior2avg > 0) {
          changePercent = ((last2avg - prior2avg) / prior2avg) * 100
          if (changePercent > 10) trend = 'up'
          else if (changePercent < -10) trend = 'down'
        }

        return {
          name,
          monthlyAmounts,
          totalSpent: Math.round(totalSpent),
          avgMonthly: Math.round(avgMonthly),
          trend,
          changePercent: Math.round(changePercent),
        }
      })
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10)

    return NextResponse.json({
      categoryTrends,
      allMonthKeys,
      monthCount: allMonthKeys.length,
    })
  } catch (error) {
    console.error('[cashflow/trends]', error)
    return NextResponse.json({ error: 'Failed to compute category trends' }, { status: 500 })
  }
}
