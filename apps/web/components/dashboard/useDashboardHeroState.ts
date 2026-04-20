'use client'

import { useMemo } from 'react'
import { useDashboard } from '@/lib/dashboardData'
import { useDashboardStateQuery } from '@/lib/queries'
import type {
  DashboardState,
  HeroMetrics,
  PriorityMetrics,
} from '@/lib/dashboardState'

const DEFAULT_LIABILITY_APR = 0.24
const DISCRETIONARY = new Set([
  'Dining',
  'Entertainment',
  'Shopping',
  'Subscriptions',
  'Travel',
])
const FIXED_VARIABLE_EXCLUDE = new Set([
  'Housing',
  'Utilities',
  'Insurance',
  'Debt Payment',
])
const IRA_LIMIT = 7000
const HSA_LIMIT = 4300

export interface DashboardHeroStateValue {
  state: DashboardState | null
  loading: boolean
  failed: boolean
  heroMetrics: HeroMetrics
  priorityMetrics: PriorityMetrics
}

/**
 * Fetches /api/dashboard/state and returns the server-computed hero +
 * priority metric bundles. Falls back to client-side derivation when the
 * server omits any field (older deployments, unexpected errors, etc.).
 */
export function useDashboardHeroState(): DashboardHeroStateValue {
  const {
    accounts,
    transactions,
    spendingByCategory,
    netWorth,
    profile,
    benefits,
    forecast,
  } = useDashboard()

  const { data, isLoading, isError } = useDashboardStateQuery()
  const state = (data?.state as DashboardState | undefined) ?? null
  const serverHero = (data?.heroMetrics ?? {}) as Partial<HeroMetrics>
  const serverPriority = (data?.priorityMetrics ?? {}) as Partial<PriorityMetrics>
  const failed = isError || (!isLoading && !state)

  const currentNetWorth = netWorth?.current ?? 0

  const clientFallback = useMemo(() => {
    // ── annualInterestCost (client fallback uses default APR only) ───────
    const liabilities = accounts.filter(
      a => (a as { classification?: string }).classification === 'liability',
    )
    const annualInterestCost = liabilities.reduce(
      (s, a) => s + Math.abs(a.balance) * DEFAULT_LIABILITY_APR,
      0,
    )

    const emergencyFundMonths = forecast?.emergencyFundMonths ?? 0
    const emergencyFundTargetMonths =
      (profile as unknown as { emergencyFundMonthsTarget?: number })?.emergencyFundMonthsTarget ?? 6

    const extracted = benefits?.extracted ?? null
    const salary = profile?.annualIncome ?? 0
    let matchGapAnnual = 0
    let totalMatchAnnual = 0
    let matchCapturedAnnual = 0
    if (extracted?.has401k && extracted.matchRate && extracted.matchCap && salary > 0) {
      totalMatchAnnual = salary * extracted.matchCap * extracted.matchRate
      const assumedCapturedRate = Math.min(extracted.matchCap, 0.02)
      matchCapturedAnnual = salary * assumedCapturedRate * extracted.matchRate
      matchGapAnnual = Math.max(0, totalMatchAnnual - matchCapturedAnnual)
    }

    const remainingTaxAdvantagedCapacity = IRA_LIMIT + HSA_LIMIT

    const totalByCat = new Map<string, number>()
    for (const tx of transactions) {
      if (tx.amount >= 0) continue
      const cat = tx.category ?? 'Other'
      totalByCat.set(cat, (totalByCat.get(cat) ?? 0) + Math.abs(tx.amount))
    }
    if (totalByCat.size === 0) {
      for (const entry of spendingByCategory) {
        totalByCat.set(entry.category, entry.amount)
      }
    }
    const variable = Array.from(totalByCat.entries())
      .filter(([c]) => !FIXED_VARIABLE_EXCLUDE.has(c))
      .reduce((s, [, v]) => s + v, 0)
    const top3Entries = Array.from(totalByCat.entries())
      .filter(([c]) => DISCRETIONARY.has(c))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
    const top3 = top3Entries.reduce((s, [, v]) => s + v, 0)
    const discretionaryConcentrationPct = variable > 0 ? top3 / variable : 0
    const topDiscretionaryCategories = top3Entries.map(([category, amount]) => ({
      category,
      amount,
    }))

    const hero: HeroMetrics = {
      annualInterestCost,
      emergencyFundMonths,
      emergencyFundTargetMonths,
      matchGapAnnual,
      remainingTaxAdvantagedCapacity,
      discretionaryConcentrationPct,
      projectedRetirementNetWorth: null,
      netWorth: currentNetWorth,
    }

    const highAprDebtTotal = liabilities.reduce(
      (s, a) => s + Math.abs(a.balance),
      0,
    )

    const priority: PriorityMetrics = {
      emergencyFundMonths,
      emergencyFundTargetMonths,
      matchGapAnnual,
      matchCapturedAnnual,
      totalMatchAnnual,
      matchDetail: null,
      remainingIra: IRA_LIMIT,
      remainingHsa: HSA_LIMIT,
      discretionaryConcentrationPct,
      topDiscretionaryCategories,
      annualInterestCost,
      highAprDebtTotal,
      projectedRetirementNetWorth: null,
      netWorth: currentNetWorth,
      taxAdvantagedBreakdown: null,
      debtPayoffScenarios: null,
    }

    return { hero, priority }
  }, [accounts, transactions, spendingByCategory, currentNetWorth, profile, benefits, forecast])

  const heroMetrics: HeroMetrics = useMemo(() => ({
    ...clientFallback.hero,
    ...Object.fromEntries(
      Object.entries(serverHero).filter(([, v]) => v !== null && v !== undefined),
    ),
  } as HeroMetrics), [clientFallback.hero, serverHero])

  const priorityMetrics: PriorityMetrics = useMemo(() => ({
    ...clientFallback.priority,
    ...Object.fromEntries(
      Object.entries(serverPriority).filter(([, v]) => v !== null && v !== undefined),
    ),
  } as PriorityMetrics), [clientFallback.priority, serverPriority])

  return { state, loading: isLoading, failed, heroMetrics, priorityMetrics }
}
