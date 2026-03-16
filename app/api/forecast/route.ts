import { NextResponse } from 'next/server'
import { USE_MOCK_DATA, mockMonthlyData, mockAccounts } from '@/lib/data'
import { prisma } from '@/lib/prisma'

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export async function GET() {
  if (USE_MOCK_DATA) {
    const avgIncome   = mockMonthlyData.reduce((s, m) => s + m.income,   0) / mockMonthlyData.length
    const avgExpenses = mockMonthlyData.reduce((s, m) => s + m.expenses, 0) / mockMonthlyData.length
    const avgSavings  = avgIncome - avgExpenses
    const checkingBalance = mockAccounts.find(a => a.accountType === 'checking')?.balance ?? 12450
    const now = new Date()

    const historicalMonths = mockMonthlyData.slice(-3).map((m, i) => ({
      month: m.month,
      balance: checkingBalance - (avgSavings * (2 - i)),
      projected: false,
    }))
    historicalMonths[historicalMonths.length - 1].balance = checkingBalance

    const projectedMonths = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() + i + 1, 1)
      return { month: MONTH_NAMES[d.getMonth()], balance: Math.round(checkingBalance + avgSavings * (i + 1)), projected: true }
    })

    return NextResponse.json({ avgIncome, avgExpenses, avgSavings, checkingBalance, emergencyFundMonths: checkingBalance / (avgExpenses || 1), historicalMonths, projectedMonths })
  }

  try {
    const since = new Date()
    since.setMonth(since.getMonth() - 6)

    const [transactions, accounts] = await Promise.all([
      prisma.transaction.findMany({ where: { date: { gte: since } }, orderBy: { date: 'asc' } }),
      prisma.account.findMany(),
    ])

    // Monthly income and expense aggregates
    const byMonth: Record<string, { income: number; expenses: number; monthIdx: number }> = {}
    for (const tx of transactions) {
      const d = new Date(tx.date)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (!byMonth[key]) byMonth[key] = { income: 0, expenses: 0, monthIdx: d.getMonth() }
      if (tx.amount > 0) byMonth[key].income += tx.amount
      else byMonth[key].expenses += Math.abs(tx.amount)
    }

    const monthValues = Object.values(byMonth)
    const count = monthValues.length || 1
    const avgIncome   = monthValues.reduce((s, m) => s + m.income,   0) / count
    const avgExpenses = monthValues.reduce((s, m) => s + m.expenses, 0) / count
    const avgSavings  = avgIncome - avgExpenses

    const checkingBalance = accounts.find(
      a => a.accountType === 'checking' || a.accountType === 'CHECKING'
    )?.balance ?? (accounts[0]?.balance ?? 0)

    const emergencyFundMonths = avgExpenses > 0 ? checkingBalance / avgExpenses : 0

    // Last 3 months of actuals, anchoring the final point at current checking balance
    const sortedEntries = Object.entries(byMonth).sort(([a], [b]) => a.localeCompare(b)).slice(-3)
    let running = checkingBalance - avgSavings * sortedEntries.length
    const historicalMonths = sortedEntries.map(([, { monthIdx }]) => {
      running += avgSavings
      return { month: MONTH_NAMES[monthIdx], balance: Math.round(running), projected: false }
    })
    if (historicalMonths.length > 0) {
      historicalMonths[historicalMonths.length - 1].balance = checkingBalance
    }

    const now = new Date()
    const projectedMonths = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() + i + 1, 1)
      return {
        month: MONTH_NAMES[d.getMonth()],
        balance: Math.round(checkingBalance + avgSavings * (i + 1)),
        projected: true,
      }
    })

    return NextResponse.json({ avgIncome, avgExpenses, avgSavings, checkingBalance, emergencyFundMonths, historicalMonths, projectedMonths })
  } catch (error) {
    console.error('[forecast]', error)
    return NextResponse.json({ error: 'Failed to compute forecast' }, { status: 500 })
  }
}
