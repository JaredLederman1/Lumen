import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const investmentTypes = [
  'brokerage', 'investment', '401k', '403b', 'ira', 'roth',
  'roth 401k', '529', 'pension', 'retirement', 'sep ira',
  'simple ira', 'ugma', 'utma', 'keogh',
]

export async function GET() {
  const result = await requireAuth()
  if ('error' in result) return result.error
  const { user: { dbUser } } = result

  const accounts = await prisma.account.findMany({
    where: {
      userId: dbUser.id,
      accountType: { in: investmentTypes },
    },
    include: {
      holdings: {
        include: { security: true },
      },
    },
  })

  const totalValue = accounts.reduce((sum, a) => sum + a.balance, 0)

  // Compute holding values first without weights, then normalise in a second pass
  const rawHoldings = accounts.flatMap(account =>
    account.holdings.map(h => {
      const gainLoss = h.costBasis != null ? h.value - h.costBasis : null
      const gainLossPct =
        h.costBasis != null && h.costBasis !== 0
          ? ((h.value - h.costBasis) / h.costBasis) * 100
          : null
      return {
        id: h.id,
        accountId: account.id,
        accountName: `${account.institutionName} ${account.accountType}`,
        ticker: h.security.ticker ?? null,
        name: h.security.name,
        type: h.security.type,
        quantity: h.quantity,
        value: h.value,
        costBasis: h.costBasis ?? null,
        gainLoss,
        gainLossPct,
      }
    })
  ).sort((a, b) => b.value - a.value)

  // Weight each holding against the actual sum of holding values (not account balance,
  // which can include uninvested cash and cause percentages to exceed 100).
  const totalHoldingsValue = rawHoldings.reduce((sum, h) => sum + h.value, 0)
  const allHoldings = rawHoldings.map(h => ({
    ...h,
    weight: totalHoldingsValue > 0 ? (h.value / totalHoldingsValue) * 100 : 0,
  }))

  // Normalise a percentage array so it always sums to exactly 100.
  function normalise<T extends { percentage: number }>(arr: T[]): T[] {
    const total = arr.reduce((s, x) => s + x.percentage, 0)
    if (total === 0) return arr
    return arr.map(x => ({ ...x, percentage: (x.percentage / total) * 100 }))
  }

  // Allocation by asset type — denominator is sum of holding values
  const typeMap = new Map<string, number>()
  for (const h of allHoldings) {
    const key = h.type.toLowerCase()
    typeMap.set(key, (typeMap.get(key) ?? 0) + h.value)
  }
  const allocationByType = normalise(
    Array.from(typeMap.entries())
      .map(([label, value]) => ({
        label,
        value,
        percentage: totalHoldingsValue > 0 ? (value / totalHoldingsValue) * 100 : 0,
      }))
      .sort((a, b) => b.value - a.value)
  )

  // Allocation by account — denominator is sum of account balances
  const accountMap = new Map<string, number>()
  for (const account of accounts) {
    const label = `${account.institutionName} ${account.accountType}`
    accountMap.set(label, (accountMap.get(label) ?? 0) + account.balance)
  }
  const allocationByAccount = normalise(
    Array.from(accountMap.entries())
      .map(([label, value]) => ({
        label,
        value,
        percentage: totalValue > 0 ? (value / totalValue) * 100 : 0,
      }))
      .sort((a, b) => b.value - a.value)
  )

  const topHoldings = allHoldings.slice(0, 10)

  const top1Pct = allHoldings[0]?.weight ?? 0
  const top5Pct = allHoldings.slice(0, 5).reduce((sum, h) => sum + h.weight, 0)
  const top10Pct = allHoldings.slice(0, 10).reduce((sum, h) => sum + h.weight, 0)

  return NextResponse.json({
    accounts,
    totalValue,
    allHoldings,
    allocationByType,
    allocationByAccount,
    topHoldings,
    concentration: { top1Pct, top5Pct, top10Pct },
    hasHoldings: allHoldings.length > 0,
  })
}
