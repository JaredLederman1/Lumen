/**
 * Threshold response derivation for /api/watch/thresholds.
 *
 * Returns SignalThreshold rows for the canonical metrics displayed in the
 * threshold composite gauges. These are display-side raw metrics (yield %,
 * subscription $/mo, dining share %, debt utilization %) computed directly
 * from accounts and transactions; they are not the same as the annual-dollar
 * Signal magnitudes produced by detection.
 *
 * Domains for which a metric cannot be derived from current data (e.g. no
 * debt accounts, no transaction history) are omitted so the gauge doesn't
 * render a misleading zero. The page-level empty state covers the case where
 * none of the four metrics yields a value.
 */

import type { PrismaClient } from '@prisma/client'
import type { SignalThreshold } from '@/lib/types/vigilance'

const HYSA_THRESHOLD_RATE_PCT = 3.5
const HYSA_BENCHMARK_RATE_PCT = 4.5
const SUBSCRIPTION_THRESHOLD = 380
const DINING_THRESHOLD_PCT = 14
const DEBT_UTILIZATION_THRESHOLD_PCT = 30
const DEBT_UTILIZATION_BENCHMARK_PCT = 10

const SUBSCRIPTION_KEYWORDS = [
  'subscription',
  'streaming',
  'netflix',
  'spotify',
  'hulu',
  'apple',
  'amazon prime',
  'youtube',
  'patreon',
  'cloud',
  'icloud',
  'dropbox',
  'gym',
  'fitness',
  'peloton',
]
const DINING_HINTS = ['food', 'restaurant', 'dining', 'coffee']

interface AccountRow {
  accountType: string
  classification: string
  balance: number
  apr: number | null
}

interface TxRow {
  amount: number
  category: string | null
  merchantName: string | null
  date: Date
}

function deriveCashYield(accounts: AccountRow[]): SignalThreshold | null {
  const liquidAssets = accounts.filter(
    a =>
      a.classification === 'asset' &&
      ['checking', 'savings', 'money market', 'cd'].includes(
        a.accountType.toLowerCase(),
      ),
  )
  if (liquidAssets.length === 0) return null

  let totalBalance = 0
  let weightedAprPct = 0
  for (const a of liquidAssets) {
    if (a.balance <= 0) continue
    totalBalance += a.balance
    const aprPct = (a.apr ?? 0) * 100
    weightedAprPct += aprPct * a.balance
  }
  if (totalBalance <= 0) return null
  const avgYieldPct = weightedAprPct / totalBalance
  const inBreach = avgYieldPct < HYSA_THRESHOLD_RATE_PCT
  return {
    gapId: 'cash_yield',
    domain: 'hysa',
    metricLabel: 'Cash yield',
    currentValue: Number(avgYieldPct.toFixed(2)),
    currentValueFormatted: `${avgYieldPct.toFixed(1)}%`,
    thresholdValue: HYSA_THRESHOLD_RATE_PCT,
    thresholdLabel: `threshold ${HYSA_THRESHOLD_RATE_PCT}%`,
    benchmarkValue: HYSA_BENCHMARK_RATE_PCT,
    benchmarkLabel: `market ${HYSA_BENCHMARK_RATE_PCT}%`,
    axisMin: 0,
    axisMax: 6,
    inBreach,
  }
}

function isSubscriptionish(tx: TxRow): boolean {
  const text = [tx.merchantName ?? '', tx.category ?? '']
    .join(' ')
    .toLowerCase()
  return SUBSCRIPTION_KEYWORDS.some(k => text.includes(k))
}

function isDining(tx: TxRow): boolean {
  const cat = (tx.category ?? '').toLowerCase()
  return DINING_HINTS.some(h => cat.includes(h))
}

function deriveSubscriptionLoad(txs: TxRow[]): SignalThreshold | null {
  if (txs.length === 0) return null
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  let total = 0
  let count = 0
  for (const tx of txs) {
    if (tx.date < cutoff) continue
    if (tx.amount >= 0) continue
    if (!isSubscriptionish(tx)) continue
    total += Math.abs(tx.amount)
    count += 1
  }
  if (count === 0) return null
  const monthly = Math.round(total)
  const inBreach = monthly > SUBSCRIPTION_THRESHOLD
  return {
    gapId: 'subscription_load',
    domain: 'idle_cash',
    metricLabel: 'Subscription load',
    currentValue: monthly,
    currentValueFormatted: `$${monthly}/mo`,
    thresholdValue: SUBSCRIPTION_THRESHOLD,
    thresholdLabel: `threshold $${SUBSCRIPTION_THRESHOLD}/mo`,
    benchmarkValue: null,
    benchmarkLabel: null,
    axisMin: 0,
    axisMax: 600,
    inBreach,
  }
}

function deriveDiningShare(txs: TxRow[]): SignalThreshold | null {
  if (txs.length === 0) return null
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  let totalSpend = 0
  let diningSpend = 0
  for (const tx of txs) {
    if (tx.date < cutoff) continue
    if (tx.amount >= 0) continue
    const abs = Math.abs(tx.amount)
    totalSpend += abs
    if (isDining(tx)) diningSpend += abs
  }
  if (totalSpend <= 0) return null
  const sharePct = (diningSpend / totalSpend) * 100
  const inBreach = sharePct > DINING_THRESHOLD_PCT
  return {
    gapId: 'dining_category',
    domain: 'idle_cash',
    metricLabel: 'Dining category drift',
    currentValue: Number(sharePct.toFixed(1)),
    currentValueFormatted: `${sharePct.toFixed(0)}%`,
    thresholdValue: DINING_THRESHOLD_PCT,
    thresholdLabel: `threshold ${DINING_THRESHOLD_PCT}%`,
    benchmarkValue: null,
    benchmarkLabel: null,
    axisMin: 0,
    axisMax: 25,
    inBreach,
  }
}

function deriveDebtUtilization(accounts: AccountRow[]): SignalThreshold | null {
  const liabilityBalance = accounts
    .filter(a => a.classification === 'liability')
    .reduce((s, a) => s + Math.abs(a.balance), 0)
  const liquidBalance = accounts
    .filter(
      a =>
        a.classification === 'asset' &&
        ['checking', 'savings', 'money market', 'cd'].includes(
          a.accountType.toLowerCase(),
        ),
    )
    .reduce((s, a) => s + a.balance, 0)
  // Need both sides to compute utilization meaningfully. With no debt, the
  // metric isn't actionable; with no liquid base, the ratio is undefined.
  if (liabilityBalance <= 0) return null
  if (liquidBalance <= 0) return null
  const utilizationPct = (liabilityBalance / (liabilityBalance + liquidBalance)) * 100
  const inBreach = utilizationPct > DEBT_UTILIZATION_THRESHOLD_PCT
  return {
    gapId: 'debt_utilization',
    domain: 'debt',
    metricLabel: 'Debt utilization',
    currentValue: Number(utilizationPct.toFixed(1)),
    currentValueFormatted: `${utilizationPct.toFixed(0)}%`,
    thresholdValue: DEBT_UTILIZATION_THRESHOLD_PCT,
    thresholdLabel: `threshold ${DEBT_UTILIZATION_THRESHOLD_PCT}%`,
    benchmarkValue: DEBT_UTILIZATION_BENCHMARK_PCT,
    benchmarkLabel: `model ${DEBT_UTILIZATION_BENCHMARK_PCT}%`,
    axisMin: 0,
    axisMax: 100,
    inBreach,
  }
}

export interface ThresholdsResponse {
  thresholds: SignalThreshold[]
}

export async function getThresholdsResponse(
  prisma: PrismaClient,
  userId: string,
): Promise<ThresholdsResponse> {
  const accounts = await prisma.account.findMany({
    where: { userId },
    select: {
      accountType: true,
      classification: true,
      balance: true,
      apr: true,
    },
  })

  // Read the trailing 60 days of transactions; subscription_load and
  // dining_category both compute over the last 30 but the extra cushion
  // tolerates timezone edges and pending-flip races without an extra round trip.
  const cutoff = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)
  const txs = await prisma.transaction.findMany({
    where: { account: { userId }, date: { gte: cutoff } },
    select: {
      amount: true,
      category: true,
      merchantName: true,
      date: true,
    },
  })

  const out: SignalThreshold[] = []
  const yieldT = deriveCashYield(accounts)
  if (yieldT) out.push(yieldT)
  const subT = deriveSubscriptionLoad(txs)
  if (subT) out.push(subT)
  const diningT = deriveDiningShare(txs)
  if (diningT) out.push(diningT)
  const debtT = deriveDebtUtilization(accounts)
  if (debtT) out.push(debtT)

  // The wire type SignalThreshold requires a non-null currentValue; metrics
  // with insufficient data are omitted so ThresholdComposite never has to
  // render a "not measured" empty state per-gauge. The section-level empty
  // state in app/dashboard/sentinel handles the no-thresholds case.
  return { thresholds: out }
}
