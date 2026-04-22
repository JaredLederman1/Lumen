/**
 * Recovery Counter logic.
 *
 * Computes the user's currently open and historically recovered opportunity
 * gaps from raw account, transaction, benefits, and profile data. The output
 * feeds two surfaces: the /api/user/recovery route (live read) and the
 * backfill script (one-time historical credit).
 *
 * Each gap has a stable id so that recoveries can be persisted in the
 * RecoveryEvent table without double-recording. Year-scoped gaps (IRA, HSA)
 * embed the calendar year in their id so the same user can recover the same
 * lever in multiple years.
 */

import type {
  Account,
  EmploymentBenefits,
  Holding,
  OnboardingProfile,
  Transaction,
} from '@prisma/client'
import type { PrismaClient } from '@prisma/client'

import { crossCheckBenefits, type ExtractedBenefits } from '@/lib/benefitsAnalysis'
import {
  classifyHoldingKind,
  DEFAULT_LIABILITY_APR,
} from '@/lib/dashboardState'
import {
  computeIraCapacity,
  computeHsaCapacity,
  type FilingStatus,
  type HsaCoverage,
} from '@/lib/taxAdvantaged'
import type { SignalDomain } from '@/lib/types/vigilance'

const HYSA_RATE = 0.045
const CHECKING_RATE = 0.0001

export type RecoveryDomain =
  | 'match'
  | 'idle_cash'
  | 'debt'
  | 'subscription'
  | 'benefits'
  | 'hysa'
  | 'tax_advantaged'

export type RecoveryStatus = 'open' | 'recovered'

export interface RecoveryGap {
  id: string
  domain: RecoveryDomain
  label: string
  annualValue: number
  lifetimeValue?: number
  status: RecoveryStatus
  recoveredAt?: string
  actionPath?: string
  description: string
}

export interface RecoveryGapInput {
  accounts: Account[]
  transactions: Transaction[]
  holdings: (Holding & { account: { accountType: string } })[]
  benefits: EmploymentBenefits | null
  profile: OnboardingProfile | null
  existingEvents: { gapId: string; annualValue: number; recoveredAt: Date }[]
}

export interface RecoveryRateOptions {
  hysaRate: number
  checkingRate: number
}

const LIQUID_ACCOUNT_TYPES = new Set(['checking', 'savings', 'money market', 'cd'])
const SAVINGS_HINTS = ['savings', 'money market']
const HIGH_APR_THRESHOLD = 0.08
const HYSA_DETECTION_APR_THRESHOLD = 0.02
const RECOVERY_HORIZON_YEARS = 30

function round(n: number): number {
  return Math.round(n)
}

function lifetimeFromAnnual(annual: number, years: number = RECOVERY_HORIZON_YEARS): number {
  if (annual <= 0 || years <= 0) return 0
  return Math.round(annual * ((Math.pow(1.07, years) - 1) / 0.07))
}

function monthlyExpensesFrom(transactions: Transaction[], accounts: Account[]): number {
  if (transactions.length === 0) return 0
  const liabilityIds = new Set(
    accounts.filter(a => a.classification === 'liability').map(a => a.id),
  )
  let total = 0
  for (const tx of transactions) {
    if (liabilityIds.has(tx.accountId)) continue
    if (tx.amount < 0) total += Math.abs(tx.amount)
  }
  return total / 3
}

function totalLiquid(accounts: Account[]): number {
  return accounts
    .filter(a => a.classification === 'asset')
    .filter(a => LIQUID_ACCOUNT_TYPES.has(a.accountType.toLowerCase()))
    .reduce((s, a) => s + a.balance, 0)
}

function checkingBalance(accounts: Account[]): number {
  return accounts
    .filter(a => a.classification === 'asset')
    .filter(a => a.accountType.toLowerCase() === 'checking')
    .reduce((s, a) => s + a.balance, 0)
}

function isSavingsAccount(account: Account): boolean {
  const type = account.accountType.toLowerCase()
  if (!SAVINGS_HINTS.some(h => type.includes(h))) return false
  const apr = account.apr ?? null
  if (apr == null) return true
  return apr >= HYSA_DETECTION_APR_THRESHOLD
}

function highAprDebt(accounts: Account[]): { total: number; interestCost: number } {
  let total = 0
  let interestCost = 0
  for (const a of accounts) {
    if (a.classification !== 'liability') continue
    const apr = a.apr ?? DEFAULT_LIABILITY_APR
    if (apr <= HIGH_APR_THRESHOLD) continue
    const balance = Math.abs(a.balance)
    total += balance
    interestCost += balance * apr
  }
  return { total, interestCost }
}

function ytdRetirementContributions(transactions: Transaction[]): number {
  const now = new Date()
  const startOfYear = new Date(now.getFullYear(), 0, 1)
  let total = 0
  for (const tx of transactions) {
    if (new Date(tx.date) < startOfYear) continue
    const cat = (tx.category ?? '').toLowerCase()
    if (cat.includes('retirement') || cat.includes('401') || cat.includes('ira')) {
      total += Math.abs(tx.amount)
    }
  }
  return total
}

function ytdContributionsByKind(
  transactions: Transaction[],
  accounts: Account[],
  holdings: RecoveryGapInput['holdings'],
): { ira: number; hsa: number; employer401k: number } {
  const now = new Date()
  const startOfYear = new Date(now.getFullYear(), 0, 1)

  const accountKindById = new Map<string, string>()
  for (const a of accounts) {
    accountKindById.set(a.id, classifyHoldingKind(a.accountType))
  }

  let ira = 0
  let hsa = 0
  let employer401k = 0

  for (const tx of transactions) {
    if (new Date(tx.date) < startOfYear) continue
    if (tx.amount <= 0) continue
    const kind = accountKindById.get(tx.accountId)
    if (kind === 'ira' || kind === 'roth_ira') ira += tx.amount
    else if (kind === 'hsa') hsa += tx.amount
    else if (kind === '401k') employer401k += tx.amount
  }

  if (ira === 0) {
    const iraBalance = holdings
      .filter(h => {
        const kind = classifyHoldingKind(h.account.accountType)
        return kind === 'ira' || kind === 'roth_ira'
      })
      .reduce((s, h) => s + h.value, 0)
    if (iraBalance > 0) ira = iraBalance
  }
  if (hsa === 0) {
    const hsaBalance = holdings
      .filter(h => classifyHoldingKind(h.account.accountType) === 'hsa')
      .reduce((s, h) => s + h.value, 0)
    if (hsaBalance > 0) hsa = hsaBalance
  }
  if (employer401k === 0) {
    const k401 = holdings
      .filter(h => classifyHoldingKind(h.account.accountType) === '401k')
      .reduce((s, h) => s + h.value, 0)
    if (k401 > 0) employer401k = k401
  }

  return { ira, hsa, employer401k }
}

function extractFilingStatus(profile: OnboardingProfile | null): FilingStatus {
  const raw = (profile?.contractParsedData ?? null) as Record<string, unknown> | null
  const v = raw?.filingStatus
  if (v === 'mfj' || v === 'married_filing_jointly') return 'mfj'
  return 'single'
}

function extractHsaCoverage(profile: OnboardingProfile | null): HsaCoverage {
  const raw = (profile?.contractParsedData ?? null) as Record<string, unknown> | null
  return raw?.hsaCoverage === 'family' ? 'family' : 'self'
}

function extractContractFlags(profile: OnboardingProfile | null) {
  const raw = (profile?.contractParsedData ?? null) as Record<string, unknown> | null
  if (!raw) return null
  const readBool = (k: string): boolean | null | undefined => {
    const v = raw[k]
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

export function evaluateGaps(
  input: RecoveryGapInput,
  opts: RecoveryRateOptions,
): RecoveryGap[] {
  const { accounts, transactions, holdings, benefits, profile, existingEvents } = input
  const eventByGapId = new Map(existingEvents.map(e => [e.gapId, e]))
  const gaps: RecoveryGap[] = []

  const annualIncome = profile?.annualIncome ?? null
  const monthlyExpenses = monthlyExpensesFrom(transactions, accounts)
  const buffer = monthlyExpenses * 3

  // ── 401k match gap ─────────────────────────────────────────────────────
  if (
    benefits?.has401k &&
    benefits.matchRate != null &&
    benefits.matchCap != null &&
    annualIncome &&
    annualIncome > 0
  ) {
    const matchAnnual = round(annualIncome * benefits.matchCap * benefits.matchRate)
    const id = 'match:401k'
    const existing = eventByGapId.get(id)
    const actionItems = (benefits.actionItemsDone ?? []) as string[]
    const markedDone =
      actionItems.includes('401(k) Enrollment') ||
      actionItems.includes('401(k) Match')
    const ytdRetirement = ytdRetirementContributions(transactions)
    const reachedThreshold =
      annualIncome > 0 && ytdRetirement >= annualIncome * benefits.matchCap * 0.5
    const isRecovered = !!existing || markedDone || reachedThreshold
    gaps.push({
      id,
      domain: 'match',
      label: '401(k) employer match',
      annualValue: matchAnnual,
      lifetimeValue: lifetimeFromAnnual(matchAnnual),
      status: isRecovered ? 'recovered' : 'open',
      recoveredAt: existing?.recoveredAt.toISOString(),
      actionPath: '/dashboard/benefits',
      description: `Contribute at least ${(benefits.matchCap * 100).toFixed(0)}% of salary to capture the full employer match.`,
    })
  }

  // ── Idle cash gap ──────────────────────────────────────────────────────
  const liquid = totalLiquid(accounts)
  const idleCash = Math.max(0, liquid - buffer)
  {
    const id = 'idle_cash:default'
    const existing = eventByGapId.get(id)
    const annualValue = round(idleCash * 0.07)
    const isRecovered = !!existing || idleCash <= 0
    if (annualValue > 0 || existing) {
      gaps.push({
        id,
        domain: 'idle_cash',
        label: 'Idle cash drag',
        annualValue: existing?.annualValue ?? annualValue,
        lifetimeValue: lifetimeFromAnnual(existing?.annualValue ?? annualValue, 10),
        status: isRecovered ? 'recovered' : 'open',
        recoveredAt: existing?.recoveredAt.toISOString(),
        actionPath: '/dashboard/opportunity',
        description: 'Move cash above your 3-month buffer into invested assets.',
      })
    }
  }

  // ── HYSA yield uplift ──────────────────────────────────────────────────
  {
    const id = 'hysa:default'
    const existing = eventByGapId.get(id)
    const checking = checkingBalance(accounts)
    const idleChecking = Math.max(0, checking - buffer)
    const annualValue = round(idleChecking * (opts.hysaRate - opts.checkingRate))
    const hasHysa = accounts.some(a => a.classification === 'asset' && isSavingsAccount(a))
    const isRecovered = !!existing || hasHysa
    if (annualValue > 0 || existing) {
      gaps.push({
        id,
        domain: 'hysa',
        label: 'High-yield savings uplift',
        annualValue: existing?.annualValue ?? annualValue,
        status: isRecovered ? 'recovered' : 'open',
        recoveredAt: existing?.recoveredAt.toISOString(),
        actionPath: '/dashboard/accounts',
        description: 'Move idle checking dollars into a high-yield savings account.',
      })
    }
  }

  // ── High-APR debt interest cost ────────────────────────────────────────
  {
    const id = 'debt:high_apr'
    const existing = eventByGapId.get(id)
    const { total: highAprTotal, interestCost } = highAprDebt(accounts)
    const annualValue = round(interestCost)
    const isRecovered = !!existing || highAprTotal <= 0
    if (annualValue > 0 || existing) {
      gaps.push({
        id,
        domain: 'debt',
        label: 'High-APR debt interest',
        annualValue: existing?.annualValue ?? annualValue,
        lifetimeValue: lifetimeFromAnnual(existing?.annualValue ?? annualValue, 5),
        status: isRecovered ? 'recovered' : 'open',
        recoveredAt: existing?.recoveredAt.toISOString(),
        actionPath: '/dashboard/forecast/debt-paydown',
        description: 'Pay down balances on debts above 8% APR to stop interest bleed.',
      })
    }
  }

  // ── Benefits gaps (per item) ───────────────────────────────────────────
  if (benefits) {
    const extracted = (benefits.rawExtraction ?? null) as ExtractedBenefits | null
    if (extracted) {
      const actionItems = (benefits.actionItemsDone ?? []) as string[]
      const items = crossCheckBenefits(extracted)
      for (const item of items) {
        if (!item.annualValue || item.annualValue <= 0) continue
        const id = `benefits:${item.label}`
        const existing = eventByGapId.get(id)
        const markedDone = actionItems.includes(item.label)
        const isRecovered = !!existing || markedDone || item.captured === true
        gaps.push({
          id,
          domain: 'benefits',
          label: item.label,
          annualValue: existing?.annualValue ?? round(item.annualValue),
          lifetimeValue: lifetimeFromAnnual(existing?.annualValue ?? item.annualValue, 5),
          status: isRecovered ? 'recovered' : 'open',
          recoveredAt: existing?.recoveredAt.toISOString(),
          actionPath: '/dashboard/benefits',
          description: item.action,
        })
      }
    }
  }

  // ── Tax-advantaged capacity (IRA + HSA, year-scoped) ───────────────────
  if (profile) {
    const year = new Date().getFullYear()
    const contract = extractContractFlags(profile)
    const ytd = ytdContributionsByKind(transactions, accounts, holdings)

    const iraCapacity = computeIraCapacity({
      age: profile.age,
      annualIncome: profile.annualIncome,
      filingStatus: extractFilingStatus(profile),
      hsaCoverage: extractHsaCoverage(profile),
      traditionalIraBalance: 0,
      iraContributedYtd: ytd.ira,
      hsaContributedYtd: ytd.hsa,
      employee401kContributedYtd: ytd.employer401k,
      employer401kContributedYtd: 0,
      current401kRothShare: null,
    })
    {
      const id = `tax_advantaged:ira:${year}`
      const existing = eventByGapId.get(id)
      const isRecovered = !!existing || iraCapacity.remaining <= 0
      const annualValue = isRecovered ? iraCapacity.limit : iraCapacity.remaining
      if (annualValue > 0 || existing) {
        gaps.push({
          id,
          domain: 'tax_advantaged',
          label: `IRA capacity (${year})`,
          annualValue: existing?.annualValue ?? round(annualValue),
          status: isRecovered ? 'recovered' : 'open',
          recoveredAt: existing?.recoveredAt.toISOString(),
          actionPath: '/dashboard/forecast',
          description: 'Use this year\'s IRA contribution room before April 15 cutoff.',
        })
      }
    }

    const hsaCapacity = computeHsaCapacity(
      {
        age: profile.age,
        annualIncome: profile.annualIncome,
        filingStatus: extractFilingStatus(profile),
        hsaCoverage: extractHsaCoverage(profile),
        traditionalIraBalance: 0,
        iraContributedYtd: ytd.ira,
        hsaContributedYtd: ytd.hsa,
        employee401kContributedYtd: ytd.employer401k,
        employer401kContributedYtd: 0,
        current401kRothShare: null,
      },
      contract,
    )
    if (hsaCapacity.eligible === 'eligible' && hsaCapacity.remaining != null) {
      const id = `tax_advantaged:hsa:${year}`
      const existing = eventByGapId.get(id)
      const isRecovered = !!existing || hsaCapacity.remaining <= 0
      const annualValue = isRecovered ? hsaCapacity.limit : hsaCapacity.remaining
      if (annualValue > 0 || existing) {
        gaps.push({
          id,
          domain: 'tax_advantaged',
          label: `HSA capacity (${year})`,
          annualValue: existing?.annualValue ?? round(annualValue),
          status: isRecovered ? 'recovered' : 'open',
          recoveredAt: existing?.recoveredAt.toISOString(),
          actionPath: '/dashboard/benefits',
          description: 'Use this year\'s HSA contribution room before the April 15 cutoff.',
        })
      }
    }
  }

  return gaps
}

export interface RecoverySummary {
  recovered: number
  open: number
  gaps: RecoveryGap[]
  lastUpdated: string
}

export function summarize(gaps: RecoveryGap[]): RecoverySummary {
  const recovered = gaps
    .filter(g => g.status === 'recovered')
    .reduce((s, g) => s + g.annualValue, 0)
  const open = gaps
    .filter(g => g.status === 'open')
    .reduce((s, g) => s + g.annualValue, 0)
  return {
    recovered: Math.round(recovered),
    open: Math.round(open),
    gaps,
    lastUpdated: new Date().toISOString(),
  }
}

/**
 * Wire format consumed by the vigilance scan runner. One entry per currently
 * flagged gap (i.e. gaps that would surface as "open" in evaluateGaps). The
 * payload carries signal-specific details the UI can render without having
 * to re-derive them.
 */
export interface DetectedGap {
  gapId: string
  domain: SignalDomain
  annualValue: number
  lifetimeValue: number | null
  payload: Record<string, unknown>
}

/**
 * RecoveryDomain is a superset of SignalDomain (it includes 'subscription',
 * which the signal layer does not track yet). This guard keeps the mapping
 * type-safe without silently dropping future domains.
 */
function toSignalDomain(domain: RecoveryDomain): SignalDomain | null {
  switch (domain) {
    case 'match':
    case 'idle_cash':
    case 'debt':
    case 'benefits':
    case 'hysa':
    case 'tax_advantaged':
      return domain
    case 'subscription':
      return null
  }
}

/**
 * Load raw data for the current user, evaluate recovery gaps, and return
 * only those that are currently flagged (status === 'open'). Recovered gaps
 * are intentionally excluded — the scan runner uses the absence of a gapId
 * from this list to drive resolution of stale signals.
 */
export async function detectGaps(
  userId: string,
  prismaClient: PrismaClient,
): Promise<DetectedGap[]> {
  const sinceDate = new Date()
  sinceDate.setMonth(sinceDate.getMonth() - 3)

  const [accounts, transactions, holdings, benefits, profile, existingEvents] =
    await Promise.all([
      prismaClient.account.findMany({ where: { userId } }),
      prismaClient.transaction.findMany({
        where: { account: { userId }, date: { gte: sinceDate } },
      }),
      prismaClient.holding.findMany({
        where: { account: { userId } },
        include: { account: { select: { accountType: true } } },
      }),
      prismaClient.employmentBenefits.findUnique({ where: { userId } }),
      prismaClient.onboardingProfile.findUnique({ where: { userId } }),
      prismaClient.recoveryEvent.findMany({ where: { userId } }),
    ])

  const gaps = evaluateGaps(
    {
      accounts,
      transactions,
      holdings,
      benefits,
      profile,
      existingEvents: existingEvents.map(e => ({
        gapId: e.gapId,
        annualValue: e.annualValue,
        recoveredAt: e.recoveredAt,
      })),
    },
    { hysaRate: HYSA_RATE, checkingRate: CHECKING_RATE },
  )

  const detected: DetectedGap[] = []
  for (const gap of gaps) {
    if (gap.status !== 'open') continue
    const domain = toSignalDomain(gap.domain)
    if (!domain) continue
    detected.push({
      gapId: gap.id,
      domain,
      annualValue: gap.annualValue,
      lifetimeValue: gap.lifetimeValue ?? null,
      payload: {
        label: gap.label,
        description: gap.description,
        actionPath: gap.actionPath ?? null,
      },
    })
  }
  return detected
}

export async function persistNewRecoveries(
  prisma: PrismaClient,
  userId: string,
  gaps: RecoveryGap[],
  existingGapIds: Set<string>,
): Promise<RecoveryGap[]> {
  const toWrite = gaps.filter(g => g.status === 'recovered' && !existingGapIds.has(g.id))
  if (toWrite.length === 0) return []
  const now = new Date()
  await prisma.recoveryEvent.createMany({
    data: toWrite.map(g => ({
      userId,
      gapId: g.id,
      domain: g.domain,
      annualValue: g.annualValue,
      recoveredAt: now,
    })),
    skipDuplicates: true,
  })
  return toWrite.map(g => ({ ...g, recoveredAt: now.toISOString() }))
}
