/**
 * Debt paydown scenario math for the /forecast/debt-paydown page.
 *
 * All functions here are pure. The page imports them for both server render
 * and client recalculation on APR edits. Month-by-month simulation runs with
 * these conventions:
 *
 *   - balances are absolute dollars (positive)
 *   - APR is a decimal fraction (0.24 for 24 percent)
 *   - monthly rate is apr / 12, applied at the start of each month
 *   - avalanche pays the highest-APR debt first; rolls each cleared debt's
 *     minimum + extra onto the next highest
 *   - minimum-only schedule keeps the credit-card 2 percent floor each month,
 *     which means cards can drift toward the 600-month cap with no extra
 */

export const CREDIT_MIN_PAYMENT_FLOOR = 25
export const CREDIT_MIN_PAYMENT_RATE = 0.02
export const DEFAULT_LOAN_TERM_MONTHS = 60
export const MAX_SIMULATION_MONTHS = 600
const EPS = 0.01

export type DebtType = 'credit' | 'loan'

export interface PaydownDebt {
  accountId: string
  label: string
  type: DebtType
  balance: number
  apr: number
  /** Stored monthly payment for installment loans. When present, used instead of
   *  the amortized calc. Ignored for credit cards. */
  statedMonthlyPayment?: number | null
  /** Remaining term in months for installment loans. When null, we fall back to
   *  DEFAULT_LOAN_TERM_MONTHS (60) to compute an amortized payment. */
  remainingTermMonths?: number | null
}

export interface MonthlyPayment {
  month: number
  accountId: string
  balanceStart: number
  payment: number
  interest: number
  principal: number
  balanceEnd: number
}

/**
 * Minimum monthly payment. Credit cards use max(2% of balance, $25). Installment
 * loans use the stored monthly payment when available, otherwise an amortized
 * payment from balance + APR + remaining term.
 */
export function computeMinimumPayment(debt: PaydownDebt): number {
  const balance = Math.abs(debt.balance)
  if (balance <= EPS) return 0

  if (debt.type === 'credit') {
    return Math.max(CREDIT_MIN_PAYMENT_FLOOR, balance * CREDIT_MIN_PAYMENT_RATE)
  }

  if (typeof debt.statedMonthlyPayment === 'number' && debt.statedMonthlyPayment > 0) {
    return debt.statedMonthlyPayment
  }

  const term = debt.remainingTermMonths && debt.remainingTermMonths > 0
    ? debt.remainingTermMonths
    : DEFAULT_LOAN_TERM_MONTHS
  const monthlyRate = debt.apr / 12
  if (monthlyRate <= 0) return balance / term
  const factor = Math.pow(1 + monthlyRate, term)
  return (balance * monthlyRate * factor) / (factor - 1)
}

export function computeEmergencyFundFloor(monthlyExpenses: number): number {
  return Math.max(0, monthlyExpenses) * 6
}

export function computeDeployableCash(
  totalCash: number,
  emergencyFundFloor: number,
): number {
  return Math.max(0, totalCash - emergencyFundFloor)
}

/**
 * Future value of a portfolio that starts at `principal` and receives
 * `monthlyContribution` at the end of each month, compounded at `annualYield`
 * for `months` months.
 */
export function projectPortfolioGrowth(
  principal: number,
  monthlyContribution: number,
  annualYield: number,
  months: number,
): number {
  if (months <= 0) return Math.max(0, principal)
  const r = annualYield / 12
  const p = Math.max(0, principal)
  const c = Math.max(0, monthlyContribution)
  if (r === 0) return p + c * months
  const growthFactor = Math.pow(1 + r, months)
  const principalFv = p * growthFactor
  const contribFv = c * ((growthFactor - 1) / r)
  return principalFv + contribFv
}

interface RunState {
  month: number
  balances: Map<string, number>
  rows: MonthlyPayment[]
}

function snapshotBalances(debts: PaydownDebt[]): Map<string, number> {
  const m = new Map<string, number>()
  for (const d of debts) m.set(d.accountId, Math.abs(d.balance))
  return m
}

function totalOutstanding(balances: Map<string, number>): number {
  let t = 0
  for (const v of balances.values()) t += v
  return t
}

function clearedAccountIds(balances: Map<string, number>): Set<string> {
  const set = new Set<string>()
  for (const [id, v] of balances) if (v <= EPS) set.add(id)
  return set
}

/**
 * Minimum-payment schedule. Each debt pays its minimum every month. When a
 * debt clears, its row stops; other debts continue.
 */
export function minimumPaymentSchedule(debts: PaydownDebt[]): MonthlyPayment[] {
  const state: RunState = {
    month: 0,
    balances: snapshotBalances(debts),
    rows: [],
  }

  while (totalOutstanding(state.balances) > EPS) {
    if (state.month >= MAX_SIMULATION_MONTHS) break
    state.month++

    for (const d of debts) {
      const balanceStart = state.balances.get(d.accountId) ?? 0
      if (balanceStart <= EPS) continue

      const interest = balanceStart * (d.apr / 12)
      const withInterest = balanceStart + interest
      const baseMin = computeMinimumPayment({ ...d, balance: withInterest })
      const payment = Math.min(baseMin, withInterest)
      const principal = payment - interest
      const balanceEnd = Math.max(0, withInterest - payment)

      state.balances.set(d.accountId, balanceEnd)
      state.rows.push({
        month: state.month,
        accountId: d.accountId,
        balanceStart,
        payment,
        interest,
        principal,
        balanceEnd,
      })
    }
  }

  return state.rows
}

/**
 * Avalanche schedule. Each debt pays its minimum; any free cash above the
 * minimums plus an optional upfront lump sum gets applied to the highest-APR
 * unpaid debt. When a debt clears, its minimum rolls into the extra budget
 * for the next highest-APR debt.
 *
 * `freeCashFlow` is the amount the user can direct each month on top of the
 * minimums. `lumpSum` is a one-time deposit applied in month 1 before
 * interest accrues.
 */
export function avalancheSchedule(
  debts: PaydownDebt[],
  freeCashFlow: number,
  lumpSum: number,
): MonthlyPayment[] {
  const state: RunState = {
    month: 0,
    balances: snapshotBalances(debts),
    rows: [],
  }

  const sortedByApr = [...debts].sort((a, b) => b.apr - a.apr)
  let remainingLump = Math.max(0, lumpSum)

  while (totalOutstanding(state.balances) > EPS) {
    if (state.month >= MAX_SIMULATION_MONTHS) break
    state.month++

    const monthRows: Map<string, MonthlyPayment> = new Map()
    const monthStartBalances: Map<string, number> = new Map()
    for (const d of debts) {
      monthStartBalances.set(d.accountId, state.balances.get(d.accountId) ?? 0)
    }

    // Apply interest, pay minimums first.
    let rolledFromCleared = 0
    for (const d of debts) {
      const balanceStart = state.balances.get(d.accountId) ?? 0
      if (balanceStart <= EPS) {
        rolledFromCleared += computeMinimumPayment({ ...d, balance: 0 })
        continue
      }

      const interest = balanceStart * (d.apr / 12)
      const withInterest = balanceStart + interest
      const minPayment = Math.min(
        computeMinimumPayment({ ...d, balance: withInterest }),
        withInterest,
      )

      state.balances.set(d.accountId, withInterest - minPayment)
      monthRows.set(d.accountId, {
        month: state.month,
        accountId: d.accountId,
        balanceStart,
        payment: minPayment,
        interest,
        principal: minPayment - interest,
        balanceEnd: withInterest - minPayment,
      })
    }

    // Direct extra budget to highest-APR debt, rolling as it clears.
    let extraBudget = Math.max(0, freeCashFlow) + rolledFromCleared + remainingLump
    remainingLump = 0

    for (const d of sortedByApr) {
      if (extraBudget <= EPS) break
      const current = state.balances.get(d.accountId) ?? 0
      if (current <= EPS) {
        // Roll this debt's minimum into the extra budget going forward.
        const freed = computeMinimumPayment({ ...d, balance: 0 })
        extraBudget += freed
        continue
      }
      const apply = Math.min(extraBudget, current)
      const newBalance = current - apply
      state.balances.set(d.accountId, newBalance)
      extraBudget -= apply

      const row = monthRows.get(d.accountId)
      if (row) {
        row.payment += apply
        row.principal += apply
        row.balanceEnd = newBalance
      }
    }

    for (const d of debts) {
      const row = monthRows.get(d.accountId)
      if (!row) continue
      state.rows.push(row)
    }
  }

  return state.rows
}

export interface ScheduleSummary {
  months: number
  totalInterest: number
  capped: boolean
}

export function summarizeSchedule(
  schedule: MonthlyPayment[],
  debts: PaydownDebt[],
): ScheduleSummary {
  if (schedule.length === 0) {
    return { months: 0, totalInterest: 0, capped: false }
  }
  const months = schedule.reduce((m, r) => Math.max(m, r.month), 0)
  const totalInterest = schedule.reduce((s, r) => s + r.interest, 0)
  const finalBalances = new Map<string, number>()
  for (const d of debts) finalBalances.set(d.accountId, Math.abs(d.balance))
  for (const row of schedule) finalBalances.set(row.accountId, row.balanceEnd)
  let outstanding = 0
  for (const v of finalBalances.values()) outstanding += v
  const capped = months >= MAX_SIMULATION_MONTHS && outstanding > EPS
  return { months, totalInterest, capped }
}

/**
 * Monthly total balance series for charting. Collapses per-debt rows into a
 * single "balance at end of month" line.
 */
export function balanceSeries(
  schedule: MonthlyPayment[],
  debts: PaydownDebt[],
): { month: number; balance: number }[] {
  const running = new Map<string, number>()
  for (const d of debts) running.set(d.accountId, Math.abs(d.balance))

  const maxMonth = schedule.reduce((m, r) => Math.max(m, r.month), 0)
  const byMonth: Map<number, MonthlyPayment[]> = new Map()
  for (const row of schedule) {
    const arr = byMonth.get(row.month) ?? []
    arr.push(row)
    byMonth.set(row.month, arr)
  }

  const series: { month: number; balance: number }[] = []
  let total = 0
  for (const v of running.values()) total += v
  series.push({ month: 0, balance: total })

  for (let m = 1; m <= maxMonth; m++) {
    for (const row of byMonth.get(m) ?? []) {
      running.set(row.accountId, row.balanceEnd)
    }
    let t = 0
    for (const v of running.values()) t += v
    series.push({ month: m, balance: t })
  }

  return series
}
