/**
 * Debt payoff scenario math.
 *
 * Runs a month-by-month amortization loop across a set of debts under three
 * strategies:
 *
 *   minimum   - pay each debt's stated minimum only. No rolling when a debt
 *               is cleared. This is the "treading water" baseline and with a
 *               2%-of-balance minimum at a 24% APR it can run to the cap.
 *   avalanche - pay all minimums, direct extra to the highest-APR debt until
 *               cleared, then roll that debt's minimum + extra onto the next
 *               highest APR. Minimizes total interest.
 *   snowball  - pay all minimums, direct extra to the smallest-balance debt
 *               until cleared, then roll onto the next smallest. Trades a
 *               little interest for earlier psychological wins.
 *
 * Simulation is bounded at 600 months so impossible-payoff scenarios terminate.
 */
export type PayoffStrategy = 'minimum' | 'avalanche' | 'snowball'

export interface DebtInput {
  accountId: string
  /** Absolute balance in dollars (positive number). */
  balance: number
  /** Annual percentage rate as decimal (0.24 for 24%). */
  apr: number
  /**
   * Optional stated minimum monthly payment. When absent, estimated once from
   * the initial balance as max(25, balance * 0.02) and held constant through
   * the simulation.
   */
  minimumPayment?: number
  /** Plaid institution name ("Chase"), surfaced for display. */
  institutionName?: string | null
  /** Plaid account type ("credit card", "student"), surfaced for display. */
  accountType?: string | null
  /** Last four digits of the account number, surfaced for display. */
  last4?: string | null
  /** User-set nickname, overrides the derived label when present. */
  customLabel?: string | null
  /** ISO timestamp of when the APR was confirmed against loan documents,
   *  null when unconfirmed (Plaid default). */
  aprConfirmedAt?: string | null
}

export interface MonthlyStep {
  month: number
  totalBalance: number
  /** Cumulative interest paid through this month. */
  totalInterest: number
  perDebtBalances: Record<string, number>
}

export interface PayoffResult {
  totalMonths: number
  totalInterestPaid: number
  payoffDate: Date
  monthlySchedule: MonthlyStep[]
  /** True when the simulation hit the 600-month cap without clearing all debt. */
  capped: boolean
}

const MAX_MONTHS = 600
const MIN_PAYMENT_FLOOR = 25
const MIN_PAYMENT_RATE = 0.02
const EPS = 0.01

function estimateMinimum(d: DebtInput): number {
  if (typeof d.minimumPayment === 'number' && d.minimumPayment > 0) {
    return d.minimumPayment
  }
  return Math.max(MIN_PAYMENT_FLOOR, Math.abs(d.balance) * MIN_PAYMENT_RATE)
}

function sumArr(arr: number[]): number {
  let s = 0
  for (const v of arr) s += v
  return s
}

function snapshot(
  ids: string[],
  balances: number[],
  month: number,
  totalInterest: number,
): MonthlyStep {
  const perDebtBalances: Record<string, number> = {}
  for (let i = 0; i < ids.length; i++) {
    perDebtBalances[ids[i]] = Math.max(0, balances[i])
  }
  return {
    month,
    totalBalance: Math.max(0, sumArr(balances)),
    totalInterest,
    perDebtBalances,
  }
}

function priorityIndices(
  strategy: 'avalanche' | 'snowball',
  balances: number[],
  aprs: number[],
): number[] {
  const idx = balances.map((_, i) => i).filter(i => balances[i] > EPS)
  if (strategy === 'avalanche') {
    idx.sort((a, b) => aprs[b] - aprs[a])
  } else {
    idx.sort((a, b) => balances[a] - balances[b])
  }
  return idx
}

interface SimulateOptions {
  extraMonthly: number
  strategy: PayoffStrategy
}

function runSimulation(
  debts: DebtInput[],
  opts: SimulateOptions,
): PayoffResult {
  const n = debts.length
  const ids = debts.map(d => d.accountId)
  const balances = debts.map(d => Math.abs(d.balance))
  const aprs = debts.map(d => d.apr)
  const minimums = debts.map(estimateMinimum)

  const schedule: MonthlyStep[] = [snapshot(ids, balances, 0, 0)]
  let totalInterest = 0
  let month = 0
  let capped = false

  if (n === 0 || balances.every(b => b <= EPS)) {
    return {
      totalMonths: 0,
      totalInterestPaid: 0,
      payoffDate: new Date(),
      monthlySchedule: schedule,
      capped: false,
    }
  }

  while (balances.some(b => b > EPS)) {
    if (month >= MAX_MONTHS) {
      capped = true
      break
    }
    month++

    for (let i = 0; i < n; i++) {
      if (balances[i] > EPS) {
        const interest = balances[i] * (aprs[i] / 12)
        balances[i] += interest
        totalInterest += interest
      }
    }

    const payments: number[] = new Array(n).fill(0)

    if (opts.strategy === 'minimum') {
      for (let i = 0; i < n; i++) {
        if (balances[i] > EPS) {
          payments[i] = Math.min(minimums[i], balances[i])
        }
      }
    } else {
      let budget = opts.extraMonthly
      for (let i = 0; i < n; i++) {
        if (balances[i] > EPS) {
          const pay = Math.min(minimums[i], balances[i])
          payments[i] = pay
        } else {
          budget += minimums[i]
        }
      }
      const order = priorityIndices(opts.strategy, balances, aprs)
      for (const i of order) {
        if (budget <= EPS) break
        const remaining = balances[i] - payments[i]
        if (remaining <= EPS) continue
        const pay = Math.min(budget, remaining)
        payments[i] += pay
        budget -= pay
      }
    }

    for (let i = 0; i < n; i++) {
      balances[i] -= payments[i]
      if (balances[i] < EPS) balances[i] = 0
    }

    schedule.push(snapshot(ids, balances, month, totalInterest))
  }

  const payoffDate = new Date()
  payoffDate.setMonth(payoffDate.getMonth() + month)

  return {
    totalMonths: month,
    totalInterestPaid: totalInterest,
    payoffDate,
    monthlySchedule: schedule,
    capped,
  }
}

export function computeMinimumPayoff(debts: DebtInput[]): PayoffResult {
  return runSimulation(debts, { extraMonthly: 0, strategy: 'minimum' })
}

export function computeAvalanchePayoff(
  debts: DebtInput[],
  extraMonthly: number,
): PayoffResult {
  return runSimulation(debts, {
    extraMonthly: Math.max(0, extraMonthly),
    strategy: 'avalanche',
  })
}

export function computeSnowballPayoff(
  debts: DebtInput[],
  extraMonthly: number,
): PayoffResult {
  return runSimulation(debts, {
    extraMonthly: Math.max(0, extraMonthly),
    strategy: 'snowball',
  })
}

export function computeCustomPayoff(
  debts: DebtInput[],
  extraMonthly: number,
  strategy: 'avalanche' | 'snowball',
): PayoffResult {
  return runSimulation(debts, {
    extraMonthly: Math.max(0, extraMonthly),
    strategy,
  })
}

export const DEBT_PAYOFF_MAX_MONTHS = MAX_MONTHS
