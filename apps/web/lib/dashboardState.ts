/**
 * Dashboard state detection.
 *
 * Evaluates a user's financial situation and returns a single state identifier
 * that drives the hero row and (eventually) the rest of the dashboard layout.
 *
 * Rules are evaluated in priority order. The first matching state wins. The
 * rationale object explains the decision and is intended for server logs and
 * debugging, not for user-facing copy.
 */

import {
  computeMatchDollars,
  projectMatchCompounded,
  inferMatchProvider,
  SupportedProvider,
  MatchFormula as MatchFormulaGeneric,
  MatchProjection,
} from './matchProjection'
import {
  computeTaxAdvantagedBreakdown,
  type TaxAdvantagedBreakdown,
  type TaxAdvantagedContract,
  type FilingStatus,
  type HsaCoverage,
} from './taxAdvantaged'
import {
  computeAvalanchePayoff,
  computeMinimumPayoff,
  computeSnowballPayoff,
  DebtInput,
  PayoffResult,
} from './debtPayoff'

export type { TaxAdvantagedBreakdown } from './taxAdvantaged'
export type { DebtInput, PayoffResult } from './debtPayoff'

export type DashboardState =
  | 'PRE_LINK'
  | 'LIABILITY_ONLY'
  | 'DEBT_DOMINANT'
  | 'FOUNDATION'
  | 'MATCH_GAP'
  | 'OPTIMIZING'
  | 'SPENDING_LEAK'
  | 'OPTIMIZED'

export type AccountClassification = 'asset' | 'liability'

export interface StateAccount {
  id: string
  classification: AccountClassification
  accountType: string
  balance: number
  /** APR as decimal fraction (e.g. 0.24 for 24%). Null when unknown. */
  apr: number | null
  /** Institution name from Plaid. Used for provider inference on retirement
   *  accounts (e.g. "Fidelity" / "Vanguard"). Null when unknown. */
  institutionName?: string | null
  /** Last four digits of the account number. Surfaced for display in the
   *  debt payoff module so users can tell two cards from the same issuer
   *  apart. Null when unknown. */
  last4?: string | null
  /** User-set nickname for this account ("My student loan"). Overrides the
   *  derived institution + type label in the debt payoff module. */
  customLabel?: string | null
  /** ISO timestamp of when the user confirmed the APR against their loan
   *  documents. Null when the APR is Plaid-provided and not user-verified. */
  aprConfirmedAt?: string | null
}

export type HoldingAccountKind = '401k' | 'ira' | 'roth_ira' | 'hsa' | 'brokerage' | 'other'

export interface StateHolding {
  accountKind: HoldingAccountKind
  balance: number
}

export interface StateOnboardingProfile {
  age: number | null
  annualIncome: number | null
  savingsRate: number | null
  retirementAge: number | null
  emergencyFundMonthsTarget: number | null
  contractParsedData: Record<string, unknown> | null
}

export interface StateTransactionsSummary {
  monthlyIncome: number
  monthlyDiscretionary: number
  monthlyVariableSpend: number
  top3DiscretionaryShare: number
  monthlyRetirementContributions: number
  /** True when monthlyRetirementContributions was derived from the canonical
   *  Retirement Contribution category. False when it fell back to substring /
   *  merchant matching, which is less reliable. */
  retirementContributionsFromCategory?: boolean
}

export interface StateTotals {
  liquidAssets: number
  totalDebt: number
  retirementBalance: number
  iraBalance: number
  /** Traditional (pre-tax) IRA balance only. Used for the backdoor Roth
   *  pro-rata rule, which would otherwise be silently violated if Roth and
   *  traditional IRA balances were lumped together. */
  traditionalIraBalance: number
  hsaBalance: number
  /** Balance held in employer 401k or 403b accounts. Null when we cannot
   *  infer it (no linked account, no holdings). */
  employerRetirementBalance?: number
  emergencyFundMonths: number
  equityAllocationPct: number | null
}

export interface DashboardStateInput {
  accounts: StateAccount[]
  holdings: StateHolding[]
  onboardingProfile: StateOnboardingProfile | null
  transactionsSummary: StateTransactionsSummary
  totals: StateTotals
}

export interface StateRationale {
  matchedRule: DashboardState
  signals: Record<string, unknown>
  notes: string[]
}

export interface DetectResult {
  state: DashboardState
  rationale: StateRationale
}

/**
 * Numerical inputs the hero row renders. All states populate every field —
 * consumers read only the ones their state uses. null means "unknown"; the
 * client renders "—" in that case.
 */
export interface HeroMetrics {
  annualInterestCost: number | null
  emergencyFundMonths: number | null
  emergencyFundTargetMonths: number | null
  matchGapAnnual: number | null
  remainingTaxAdvantagedCapacity: number | null
  discretionaryConcentrationPct: number | null
  projectedRetirementNetWorth: number | null
  netWorth: number | null
}

/**
 * Rich match-gap detail used by the interactive MatchGapCard widget. Present
 * only when the user is in MATCH_GAP, OPTIMIZING, or FOUNDATION with enough
 * contract data to compute it. Null otherwise.
 */
export interface MatchDetail {
  salary: number
  currentEmployeeRate: number
  /** true if the rate came from canonical retirement-category transactions,
   *  false if it fell back to substring merchant matching or the placeholder. */
  inferredFromCategory: boolean
  matchFormula: { matchRate: number; matchCap: number } | null
  matchProviderInferred: SupportedProvider | null
  yearsToRetirement: number
  compoundedProjection: MatchProjection
  /** Full-capture projection used for the "at the full match rate" comparison. */
  fullMatchProjection: MatchProjection
}

/**
 * Numerical inputs the priority-row widgets render. Superset of hero
 * metrics — anything a priority widget needs goes here, even when it
 * duplicates a hero value.
 */
export interface PriorityMetrics {
  emergencyFundMonths: number | null
  emergencyFundTargetMonths: number | null
  matchGapAnnual: number | null
  matchCapturedAnnual: number | null
  totalMatchAnnual: number | null
  matchDetail: MatchDetail | null
  remainingIra: number | null
  remainingHsa: number | null
  discretionaryConcentrationPct: number | null
  topDiscretionaryCategories: { category: string; amount: number }[]
  annualInterestCost: number | null
  highAprDebtTotal: number | null
  projectedRetirementNetWorth: number | null
  netWorth: number | null
  /** Full tax-advantaged breakdown for the TaxAdvantagedCapacityCard widget.
   *  Populated only when the user is in a state that surfaces the card
   *  (OPTIMIZING, or FOUNDATION with retirement holdings). Null otherwise. */
  taxAdvantagedBreakdown: TaxAdvantagedBreakdown | null
  /** Initial debts list and default-extra-payment payoff scenarios consumed by
   *  the interactive DebtTrajectoryCard. Populated only in DEBT_DOMINANT and
   *  LIABILITY_ONLY (the two states that surface the card). Null otherwise. */
  debtPayoffScenarios: DebtPayoffScenarios | null
}

/**
 * Payoff scenarios returned to the client for the DebtTrajectoryCard widget.
 * The client re-simulates on slider changes using the same `debts` list so it
 * does not have to round-trip to the server on every tick.
 */
export interface DebtPayoffScenarios {
  minimum: PayoffResult
  avalanche: PayoffResult
  snowball: PayoffResult
  debts: DebtInput[]
  /** Default extra-payment value used to seed the server scenarios. The client
   *  slider starts here and re-simulates when the user drags. */
  defaultExtraMonthly: number
}

// ── Constants ────────────────────────────────────────────────────────────────

/** APR threshold for "high-APR" debt. */
const HIGH_APR_THRESHOLD = 0.08

/** Conservative default APR for liability accounts when none is known. */
export const DEFAULT_LIABILITY_APR = 0.24

/** Annual IRA contribution limit (2026 estimate, rounded). Used only as a
 *  ceiling for "remaining capacity" checks. */
export const IRA_ANNUAL_LIMIT = 7000

/** Annual HSA contribution limit, individual coverage. */
export const HSA_ANNUAL_LIMIT = 4300

/** Placeholder contribution rate used when we cannot infer one from data but
 *  the user plausibly has a 401k and a match formula is known. Keeping this
 *  conservative (2% of salary) biases us toward MATCH_GAP when in doubt,
 *  because the cost of missing the match is higher than the cost of a
 *  slightly-wrong hero. */
export const FALLBACK_CONTRIBUTION_RATE = 0.02

/** Default extra monthly payment the server seeds into avalanche and snowball
 *  scenarios. The client slider starts here. */
export const DEFAULT_DEBT_EXTRA_MONTHLY = 200

// ── Helpers ──────────────────────────────────────────────────────────────────

function sum(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0)
}

interface MatchFormula {
  matchRate: number
  matchCap: number
}

function extractMatchFormula(
  contractParsedData: Record<string, unknown> | null,
): MatchFormula | null {
  if (!contractParsedData) return null
  const raw = contractParsedData as Record<string, unknown>
  const matchRate = typeof raw.matchRate === 'number' ? raw.matchRate : null
  const matchCap = typeof raw.matchCap === 'number' ? raw.matchCap : null
  if (matchRate == null || matchCap == null) return null
  if (matchRate <= 0 || matchCap <= 0) return null
  return { matchRate, matchCap }
}

function inferContributionRate(
  input: DashboardStateInput,
): { rate: number; source: 'transactions' | 'fallback' } {
  const { transactionsSummary, onboardingProfile } = input
  const annualIncome = onboardingProfile?.annualIncome ?? 0
  if (annualIncome <= 0) {
    return { rate: FALLBACK_CONTRIBUTION_RATE, source: 'fallback' }
  }
  const annualContribFromTx = transactionsSummary.monthlyRetirementContributions * 12
  if (annualContribFromTx > 0) {
    return { rate: annualContribFromTx / annualIncome, source: 'transactions' }
  }
  return { rate: FALLBACK_CONTRIBUTION_RATE, source: 'fallback' }
}

function hasHoldingKind(
  holdings: StateHolding[],
  kinds: HoldingAccountKind[],
): boolean {
  const set = new Set(kinds)
  return holdings.some(h => set.has(h.accountKind) && h.balance > 0)
}

function has401kHoldings(holdings: StateHolding[]): boolean {
  return hasHoldingKind(holdings, ['401k'])
}

function hasAnyRetirementHoldings(holdings: StateHolding[]): boolean {
  return hasHoldingKind(holdings, ['401k', 'ira', 'roth_ira', 'hsa'])
}

function highAprDebtTotal(accounts: StateAccount[]): number {
  return sum(
    accounts
      .filter(a => a.classification === 'liability')
      .filter(a => (a.apr ?? DEFAULT_LIABILITY_APR) > HIGH_APR_THRESHOLD)
      .map(a => Math.abs(a.balance)),
  )
}

// ── Main detector ────────────────────────────────────────────────────────────

export function detectDashboardState(
  input: DashboardStateInput,
): DetectResult {
  const {
    accounts,
    holdings,
    onboardingProfile,
    transactionsSummary,
    totals,
  } = input

  const notes: string[] = []
  const signals: Record<string, unknown> = {
    accountCount: accounts.length,
    assetAccountCount: accounts.filter(a => a.classification === 'asset').length,
    liabilityAccountCount: accounts.filter(a => a.classification === 'liability').length,
    liquidAssets: totals.liquidAssets,
    totalDebt: totals.totalDebt,
    retirementBalance: totals.retirementBalance,
    emergencyFundMonths: totals.emergencyFundMonths,
    equityAllocationPct: totals.equityAllocationPct,
    monthlyIncome: transactionsSummary.monthlyIncome,
    monthlyDiscretionary: transactionsSummary.monthlyDiscretionary,
    monthlyVariableSpend: transactionsSummary.monthlyVariableSpend,
    top3DiscretionaryShare: transactionsSummary.top3DiscretionaryShare,
    savingsRate: onboardingProfile?.savingsRate ?? null,
    age: onboardingProfile?.age ?? null,
    annualIncome: onboardingProfile?.annualIncome ?? null,
    hasContractData: !!onboardingProfile?.contractParsedData,
  }

  // 1. PRE_LINK ────────────────────────────────────────────────────────────
  if (accounts.length === 0) {
    return {
      state: 'PRE_LINK',
      rationale: { matchedRule: 'PRE_LINK', signals, notes: ['no accounts linked'] },
    }
  }

  // 2. LIABILITY_ONLY ─────────────────────────────────────────────────────
  const hasAnyAsset = accounts.some(a => a.classification === 'asset')
  if (!hasAnyAsset) {
    return {
      state: 'LIABILITY_ONLY',
      rationale: {
        matchedRule: 'LIABILITY_ONLY',
        signals,
        notes: ['no asset accounts linked'],
      },
    }
  }

  // 3. DEBT_DOMINANT ──────────────────────────────────────────────────────
  const hasAnyHighAprDebt = accounts.some(
    a =>
      a.classification === 'liability' &&
      (a.apr ?? DEFAULT_LIABILITY_APR) > HIGH_APR_THRESHOLD,
  )
  const highAprDebt = highAprDebtTotal(accounts)
  signals.highAprDebtTotal = highAprDebt
  if (
    hasAnyHighAprDebt &&
    totals.liquidAssets > 0 &&
    highAprDebt > totals.liquidAssets * 0.5
  ) {
    notes.push('high-APR debt > 50% of liquid assets')
    return {
      state: 'DEBT_DOMINANT',
      rationale: { matchedRule: 'DEBT_DOMINANT', signals, notes },
    }
  }
  // Edge case: no liquid assets at all but non-trivial high-APR debt.
  if (hasAnyHighAprDebt && totals.liquidAssets <= 0 && highAprDebt > 0) {
    notes.push('high-APR debt present with zero liquid assets')
    return {
      state: 'DEBT_DOMINANT',
      rationale: { matchedRule: 'DEBT_DOMINANT', signals, notes },
    }
  }

  // 4. FOUNDATION ─────────────────────────────────────────────────────────
  const efTarget = onboardingProfile?.emergencyFundMonthsTarget ?? 3
  const thinEmergencyFund = totals.emergencyFundMonths < Math.min(3, efTarget)
  if (
    totals.liquidAssets > 0 &&
    !hasAnyRetirementHoldings(holdings) &&
    thinEmergencyFund
  ) {
    notes.push('liquid assets present, no retirement holdings, thin emergency fund')
    return {
      state: 'FOUNDATION',
      rationale: { matchedRule: 'FOUNDATION', signals, notes },
    }
  }

  // 5. MATCH_GAP ──────────────────────────────────────────────────────────
  const matchFormula = extractMatchFormula(onboardingProfile?.contractParsedData ?? null)
  signals.matchFormulaKnown = !!matchFormula
  if (has401kHoldings(holdings) && matchFormula) {
    const { rate, source } = inferContributionRate(input)
    signals.inferredContributionRate = rate
    signals.contributionRateSource = source
    if (rate < matchFormula.matchCap) {
      notes.push(
        `contribution rate ${(rate * 100).toFixed(1)}% below match cap ${(matchFormula.matchCap * 100).toFixed(1)}% (source: ${source})`,
      )
      return {
        state: 'MATCH_GAP',
        rationale: { matchedRule: 'MATCH_GAP', signals, notes },
      }
    }
  } else if (has401kHoldings(holdings) && !matchFormula) {
    notes.push('has 401k holdings but no match formula in contract — cannot confirm MATCH_GAP')
  }

  // 6. OPTIMIZING ─────────────────────────────────────────────────────────
  // Full match is "captured" when either (a) there is no match formula (so
  // we cannot flag a gap and we move on) or (b) contribution rate meets the cap.
  const iraRoom = totals.iraBalance < IRA_ANNUAL_LIMIT
  const hsaRoom = totals.hsaBalance < HSA_ANNUAL_LIMIT
  if (has401kHoldings(holdings) && (iraRoom || hsaRoom)) {
    notes.push('match captured or unverifiable; remaining IRA/HSA capacity')
    return {
      state: 'OPTIMIZING',
      rationale: { matchedRule: 'OPTIMIZING', signals, notes },
    }
  }

  // 7. SPENDING_LEAK ──────────────────────────────────────────────────────
  const savingsRate = onboardingProfile?.savingsRate ?? 0
  if (
    savingsRate >= 0.15 &&
    transactionsSummary.monthlyVariableSpend > 0 &&
    transactionsSummary.top3DiscretionaryShare > 0.5
  ) {
    notes.push(
      `savings rate ${(savingsRate * 100).toFixed(0)}% with top-3 discretionary at ${(transactionsSummary.top3DiscretionaryShare * 100).toFixed(0)}% of variable`,
    )
    return {
      state: 'SPENDING_LEAK',
      rationale: { matchedRule: 'SPENDING_LEAK', signals, notes },
    }
  }

  // 8. OPTIMIZED ──────────────────────────────────────────────────────────
  // Default fallthrough. All boxes checked: no high-APR debt, emergency fund
  // at target, retirement holdings present, allocation within age band.
  const age = onboardingProfile?.age ?? null
  const equity = totals.equityAllocationPct
  const efAtTarget = totals.emergencyFundMonths >= (efTarget ?? 6)
  const allocationHealthy =
    age == null ||
    equity == null ||
    (equity >= 100 - age - 10 && equity <= 130 - age + 10)
  if (
    !hasAnyHighAprDebt &&
    hasAnyRetirementHoldings(holdings) &&
    efAtTarget &&
    allocationHealthy
  ) {
    notes.push('no high-APR debt, retirement present, emergency fund at target, allocation in-band')
    return {
      state: 'OPTIMIZED',
      rationale: { matchedRule: 'OPTIMIZED', signals, notes },
    }
  }

  // Catch-all: if we reach here, the user has assets but doesn't cleanly fit
  // the above. Default to FOUNDATION as the safest action-oriented hero.
  notes.push('no rule matched cleanly; defaulting to FOUNDATION')
  return {
    state: 'FOUNDATION',
    rationale: { matchedRule: 'FOUNDATION', signals, notes },
  }
}

// ── Metrics computation ──────────────────────────────────────────────────────

/**
 * Annual interest cost using stored APR when present, else the conservative
 * default. Only liability accounts contribute.
 */
export function computeAnnualInterestCost(
  accounts: StateAccount[],
): number {
  return accounts
    .filter(a => a.classification === 'liability')
    .reduce(
      (s, a) =>
        s + Math.abs(a.balance) * (a.apr ?? DEFAULT_LIABILITY_APR),
      0,
    )
}

export function computeMatchMetrics(input: DashboardStateInput): {
  matchCapturedAnnual: number | null
  totalMatchAnnual: number | null
  matchGapAnnual: number | null
} {
  const profile = input.onboardingProfile
  const formula = extractMatchFormula(profile?.contractParsedData ?? null)
  const salary = profile?.annualIncome ?? 0
  if (!formula || salary <= 0) {
    return {
      matchCapturedAnnual: null,
      totalMatchAnnual: null,
      matchGapAnnual: null,
    }
  }
  const totalMatch = Math.max(0, salary * formula.matchCap * formula.matchRate)
  const { rate } = inferContributionRate(input)
  const capturedRate = Math.min(rate, formula.matchCap)
  const captured = Math.max(0, salary * capturedRate * formula.matchRate)
  const gap = Math.max(0, totalMatch - captured)
  return {
    matchCapturedAnnual: Math.round(captured),
    totalMatchAnnual: Math.round(totalMatch),
    matchGapAnnual: Math.round(gap),
  }
}

/**
 * Default retirement horizon when the user has not supplied age/retirementAge
 * in onboarding. Keeps the MatchGapCard projection useful instead of zero.
 */
export const DEFAULT_YEARS_TO_RETIREMENT = 30

/**
 * Produce the rich MatchDetail object consumed by the interactive MatchGapCard.
 * Returns null when no match formula is available. Safe to call in any state —
 * the API route decides whether to forward it.
 */
export function computeMatchDetail(input: DashboardStateInput): MatchDetail | null {
  const profile = input.onboardingProfile
  const formula = extractMatchFormula(profile?.contractParsedData ?? null)
  const salary = profile?.annualIncome ?? 0
  if (!formula || salary <= 0) return null

  const { rate, source } = inferContributionRate(input)
  const inferredFromCategory =
    source === 'transactions' &&
    input.transactionsSummary.retirementContributionsFromCategory === true

  const age = profile?.age ?? null
  const retirementAge = profile?.retirementAge ?? null
  const yearsToRetirement =
    age != null && retirementAge != null && retirementAge > age
      ? retirementAge - age
      : DEFAULT_YEARS_TO_RETIREMENT

  const genericFormula: MatchFormulaGeneric = {
    matchRate: formula.matchRate,
    matchCap: formula.matchCap,
  }

  const compoundedProjection = projectMatchCompounded(
    salary,
    rate,
    genericFormula,
    yearsToRetirement,
  )
  const fullMatchProjection = projectMatchCompounded(
    salary,
    formula.matchCap,
    genericFormula,
    yearsToRetirement,
  )

  const provider = inferMatchProvider(
    input.accounts.map(a => ({
      institutionName: a.institutionName ?? null,
      accountType: a.accountType,
    })),
  )

  return {
    salary,
    currentEmployeeRate: rate,
    inferredFromCategory,
    matchFormula: { matchRate: formula.matchRate, matchCap: formula.matchCap },
    matchProviderInferred: provider,
    yearsToRetirement,
    compoundedProjection,
    fullMatchProjection,
  }
}

// Keep tree-shakers happy: we re-export the dollars helper so callers can hit
// a single module for both server-side detail and the same formula used in the
// client slider.
export { computeMatchDollars }

export function computeTaxAdvantagedRoom(totals: StateTotals): {
  remainingIra: number
  remainingHsa: number
  total: number
} {
  const remainingIra = Math.max(0, IRA_ANNUAL_LIMIT - totals.iraBalance)
  const remainingHsa = Math.max(0, HSA_ANNUAL_LIMIT - totals.hsaBalance)
  return { remainingIra, remainingHsa, total: remainingIra + remainingHsa }
}

/**
 * True when the TaxAdvantagedCapacityCard should render a functional
 * breakdown. We surface it when the user is OPTIMIZING, or in FOUNDATION
 * with at least some retirement holdings. All other states either lack
 * the retirement data (PRE_LINK, LIABILITY_ONLY) or have higher-priority
 * frames (DEBT_DOMINANT, MATCH_GAP, SPENDING_LEAK, OPTIMIZED).
 */
export function shouldComputeTaxAdvantagedBreakdown(
  state: DashboardState,
  holdings: StateHolding[],
): boolean {
  if (state === 'OPTIMIZING') return true
  if (state === 'FOUNDATION') {
    return holdings.some(
      h =>
        (['401k', 'ira', 'roth_ira', 'hsa'] as HoldingAccountKind[]).includes(h.accountKind) &&
        h.balance > 0,
    )
  }
  return false
}

function extractContract(
  contractParsedData: Record<string, unknown> | null,
): TaxAdvantagedContract | null {
  if (!contractParsedData) return null
  const readBool = (k: string): boolean | null | undefined => {
    const v = contractParsedData[k]
    if (typeof v === 'boolean') return v
    if (v === null) return null
    return undefined
  }
  return {
    hasHSA: readBool('hasHSA'),
    hasHDHP: readBool('hasHDHP'),
    allowsAfterTax401k: readBool('allowsAfterTax401k'),
    allowsInServiceRollover: readBool('allowsInServiceRollover'),
    hasRoth401k: readBool('hasRoth401k'),
  }
}

function extractFilingStatus(
  contractParsedData: Record<string, unknown> | null,
): FilingStatus {
  const v = contractParsedData?.filingStatus
  if (v === 'mfj' || v === 'married_filing_jointly') return 'mfj'
  return 'single'
}

function extractHsaCoverage(
  contractParsedData: Record<string, unknown> | null,
): HsaCoverage {
  const v = contractParsedData?.hsaCoverage
  if (v === 'family') return 'family'
  return 'self'
}

/**
 * Assemble the inputs the taxAdvantaged library expects from a full
 * DashboardStateInput. Approximates YTD contributions from current balances
 * capped at the annual limit, matching computeTaxAdvantagedRoom semantics.
 */
export function buildTaxAdvantagedBreakdown(
  input: DashboardStateInput,
): TaxAdvantagedBreakdown {
  const profile = input.onboardingProfile
  const contract = extractContract(profile?.contractParsedData ?? null)
  const ira = input.totals.iraBalance
  const hsa = input.totals.hsaBalance
  const employerRetirement = input.totals.employerRetirementBalance ?? 0

  return computeTaxAdvantagedBreakdown(
    {
      age: profile?.age ?? null,
      annualIncome: profile?.annualIncome ?? null,
      filingStatus: extractFilingStatus(profile?.contractParsedData ?? null),
      hsaCoverage: extractHsaCoverage(profile?.contractParsedData ?? null),
      traditionalIraBalance: input.totals.traditionalIraBalance,
      iraContributedYtd: Math.min(ira, 8_000),
      hsaContributedYtd: Math.min(hsa, 8_550),
      employee401kContributedYtd: Math.min(employerRetirement, 23_500),
      employer401kContributedYtd: 0,
      current401kRothShare: null,
    },
    contract,
  )
}

/**
 * Rough projected-net-worth-at-retirement model. Starts with current net
 * worth (approximated here as liquid + retirement - debt) and grows it at
 * a 6% real return. Returns null if we lack the profile data to project.
 */
export function computeProjectedRetirementNetWorth(input: DashboardStateInput): number | null {
  const profile = input.onboardingProfile
  if (!profile?.age || !profile?.retirementAge) return null
  const years = Math.max(0, profile.retirementAge - profile.age)
  const current =
    input.totals.liquidAssets + input.totals.retirementBalance - input.totals.totalDebt
  const annualContrib = (profile.annualIncome ?? 0) * (profile.savingsRate ?? 0)
  const growth = 0.06
  // Future value of current stock + future value of annuity of contributions.
  const futureCurrent = current * Math.pow(1 + growth, years)
  const futureContrib =
    growth > 0
      ? annualContrib * ((Math.pow(1 + growth, years) - 1) / growth)
      : annualContrib * years
  return Math.round(futureCurrent + futureContrib)
}

export function computeHeroMetrics(input: DashboardStateInput): HeroMetrics {
  const { emergencyFundMonths } = input.totals
  const efTarget = input.onboardingProfile?.emergencyFundMonthsTarget ?? 6
  const annualInterestCost = computeAnnualInterestCost(input.accounts)
  const match = computeMatchMetrics(input)
  const taxRoom = computeTaxAdvantagedRoom(input.totals)
  const netWorth =
    input.totals.liquidAssets + input.totals.retirementBalance - input.totals.totalDebt
  return {
    annualInterestCost: Number.isFinite(annualInterestCost) ? annualInterestCost : null,
    emergencyFundMonths: Number.isFinite(emergencyFundMonths) ? emergencyFundMonths : null,
    emergencyFundTargetMonths: efTarget,
    matchGapAnnual: match.matchGapAnnual,
    remainingTaxAdvantagedCapacity: taxRoom.total,
    discretionaryConcentrationPct:
      input.transactionsSummary.monthlyVariableSpend > 0
        ? input.transactionsSummary.top3DiscretionaryShare
        : null,
    projectedRetirementNetWorth: computeProjectedRetirementNetWorth(input),
    netWorth,
  }
}

export function computePriorityMetrics(
  input: DashboardStateInput,
  topDiscretionaryCategories: { category: string; amount: number }[],
  state?: DashboardState,
): PriorityMetrics {
  const efTarget = input.onboardingProfile?.emergencyFundMonthsTarget ?? 6
  const match = computeMatchMetrics(input)
  const taxRoom = computeTaxAdvantagedRoom(input.totals)
  const annualInterestCost = computeAnnualInterestCost(input.accounts)
  const highAprDebtTotal = sum(
    input.accounts
      .filter(a => a.classification === 'liability')
      .filter(a => (a.apr ?? DEFAULT_LIABILITY_APR) > HIGH_APR_THRESHOLD)
      .map(a => Math.abs(a.balance)),
  )
  const netWorth =
    input.totals.liquidAssets + input.totals.retirementBalance - input.totals.totalDebt

  const taxAdvantagedBreakdown =
    state && shouldComputeTaxAdvantagedBreakdown(state, input.holdings)
      ? buildTaxAdvantagedBreakdown(input)
      : null

  const debtPayoffScenarios = state
    ? computeDebtPayoffScenarios(input.accounts, state)
    : null

  return {
    emergencyFundMonths: Number.isFinite(input.totals.emergencyFundMonths)
      ? input.totals.emergencyFundMonths
      : null,
    emergencyFundTargetMonths: efTarget,
    matchGapAnnual: match.matchGapAnnual,
    matchCapturedAnnual: match.matchCapturedAnnual,
    totalMatchAnnual: match.totalMatchAnnual,
    matchDetail: computeMatchDetail(input),
    remainingIra: taxRoom.remainingIra,
    remainingHsa: taxRoom.remainingHsa,
    discretionaryConcentrationPct:
      input.transactionsSummary.monthlyVariableSpend > 0
        ? input.transactionsSummary.top3DiscretionaryShare
        : null,
    topDiscretionaryCategories,
    annualInterestCost,
    highAprDebtTotal,
    projectedRetirementNetWorth: computeProjectedRetirementNetWorth(input),
    netWorth,
    taxAdvantagedBreakdown,
    debtPayoffScenarios,
  }
}

/**
 * Build the DebtTrajectoryCard payload. Returns null outside of the two states
 * that surface the card, or when the user has no liability accounts. Runs the
 * default-extra ($200/mo) avalanche and snowball simulations up front so the
 * client can render immediately while it lazily re-simulates on slider drags.
 */
export function computeDebtPayoffScenarios(
  accounts: StateAccount[],
  state: DashboardState,
  extraMonthly: number = DEFAULT_DEBT_EXTRA_MONTHLY,
): DebtPayoffScenarios | null {
  if (state !== 'DEBT_DOMINANT' && state !== 'LIABILITY_ONLY') return null
  const debts: DebtInput[] = accounts
    .filter(a => a.classification === 'liability' && Math.abs(a.balance) > 0)
    .map(a => ({
      accountId: a.id,
      balance: Math.abs(a.balance),
      apr: a.apr ?? DEFAULT_LIABILITY_APR,
      institutionName: a.institutionName ?? null,
      accountType: a.accountType,
      last4: a.last4 ?? null,
      customLabel: a.customLabel ?? null,
      aprConfirmedAt: a.aprConfirmedAt ?? null,
    }))
  if (debts.length === 0) return null
  const extra = Math.max(0, extraMonthly)
  return {
    debts,
    defaultExtraMonthly: extra,
    minimum: computeMinimumPayoff(debts),
    avalanche: computeAvalanchePayoff(debts, extra),
    snowball: computeSnowballPayoff(debts, extra),
  }
}

// ── Classification helpers used by the API route ─────────────────────────────

/**
 * Classify a prisma Account row's accountType into a holding account kind.
 * Used when an account itself represents a retirement vehicle (e.g. a linked
 * 401k with no per-security holdings).
 */
export function classifyHoldingKind(accountType: string): HoldingAccountKind {
  const t = accountType.toLowerCase()
  if (t.includes('401') || t.includes('403')) return '401k'
  if (t.includes('roth')) return 'roth_ira'
  if (t.includes('ira') || t.includes('retirement') || t.includes('pension')) return 'ira'
  if (t.includes('hsa')) return 'hsa'
  if (t.includes('brokerage') || t.includes('investment') || t.includes('529')) return 'brokerage'
  return 'other'
}
