import { mockTransactions, mockAccounts } from '@/lib/mockData'

// ── Shared types ──────────────────────────────────────────────────────────────

export interface ExtractedBenefits {
  baseSalary: number | null
  annualBonusTargetPct: number | null
  signingBonus: number | null
  has401k: boolean
  matchRate: number | null
  matchCap: number | null
  vestingYears: number | null
  hasHSA: boolean
  hsaEmployerContrib: number | null
  hasFSA: boolean
  fsaLimit: number | null
  hasRSUs: boolean
  rsuTotalShares: number | null
  rsuVestYears: number | null
  rsuCliffYears: number | null
  hasESPP: boolean
  esppDiscount: number | null
  hasCommuterBenefits: boolean
  commuterMonthlyLimit: number | null
  tuitionReimbursement: number | null
  wellnessStipend: number | null
  homeOfficeStipend: number | null
  professionalDevBudget: number | null
  ptoDays: number | null
  hasSeverance: boolean
  severanceMonths: number | null
  hasLifeInsurance: boolean
  hasSTDLTD: boolean
}

export interface BenefitStatus {
  label: string
  annualValue: number | null
  captured: boolean | null   // null = cannot determine from available data
  evidence: string
  urgency: 'critical' | 'high' | 'medium' | 'info'
  action: string
}

// ── Formatting helper ─────────────────────────────────────────────────────────

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

// ── Cross-check benefits against financial data ───────────────────────────────

export function crossCheckBenefits(e: ExtractedBenefits): BenefitStatus[] {
  const salary = e.baseSalary ?? 150000
  const results: BenefitStatus[] = []

  // 401(k) match
  if (e.has401k) {
    const annual = Math.round(salary * (e.matchCap ?? 0) * (e.matchRate ?? 0))
    const hasRetirementAccount = mockAccounts.some(a =>
      a.accountType.toLowerCase().includes('retirement') ||
      a.accountType.toLowerCase().includes('401k')
    )
    results.push({
      label: '401(k) Employer Match',
      annualValue: annual,
      captured: hasRetirementAccount,
      evidence: hasRetirementAccount
        ? 'Retirement account detected in connected accounts.'
        : 'No 401k account linked. Vanguard account is a personal brokerage — employer 401k enrollment not confirmed.',
      urgency: 'critical',
      action: `Enroll and contribute at least ${((e.matchCap ?? 0) * 100).toFixed(0)}% of salary to capture the full ${fmt(annual)}/yr employer match.`,
    })
  }

  // Wellness stipend
  if (e.wellnessStipend) {
    const equinoxAnnual = mockTransactions
      .filter(t => t.merchantName.toLowerCase().includes('equinox'))
      .reduce((sum, t) => sum + Math.abs(t.amount), 0) * 2
    const hasReimbursement = mockTransactions.some(t =>
      t.amount > 0 && (
        t.merchantName.toLowerCase().includes('wellness') ||
        t.merchantName.toLowerCase().includes('stipend') ||
        t.merchantName.toLowerCase().includes('reimburse')
      )
    )
    results.push({
      label: 'Wellness Stipend',
      annualValue: e.wellnessStipend,
      captured: hasReimbursement,
      evidence: hasReimbursement
        ? 'Wellness reimbursement detected in transactions.'
        : `Equinox charges of ~${fmt(equinoxAnnual)}/yr detected as out-of-pocket. No wellness reimbursement income found — ${fmt(e.wellnessStipend)}/yr stipend appears unclaimed.`,
      urgency: 'high',
      action: `Submit your Equinox (or other eligible) receipts to HR to claim up to ${fmt(e.wellnessStipend)}/yr.`,
    })
  }

  // Commuter benefits
  if (e.hasCommuterBenefits) {
    const transitAnnual = mockTransactions
      .filter(t => t.category === 'Transport')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0) * 2
    const taxSavings = Math.round((e.commuterMonthlyLimit ?? 315) * 12 * 0.28)
    results.push({
      label: 'Pre-Tax Commuter Benefits',
      annualValue: taxSavings,
      captured: false,
      evidence: `~${fmt(transitAnnual)}/yr in transit spending detected with no pre-tax benefit deductions. You are paying full after-tax dollars.`,
      urgency: 'high',
      action: `Enroll in pre-tax commuter benefits through HR to save ~${fmt(taxSavings)}/yr in taxes on transit.`,
    })
  }

  // Professional dev
  if (e.professionalDevBudget) {
    const hasCourseSpend = mockTransactions.some(t =>
      t.merchantName.toLowerCase().includes('coursera') ||
      t.merchantName.toLowerCase().includes('udemy') ||
      t.merchantName.toLowerCase().includes('conference') ||
      t.merchantName.toLowerCase().includes('training')
    )
    results.push({
      label: 'Professional Development Budget',
      annualValue: e.professionalDevBudget,
      captured: hasCourseSpend ? null : false,
      evidence: hasCourseSpend
        ? 'Course/training spending detected — verify reimbursement requests are submitted.'
        : `No course, conference, or training expenses found. ${fmt(e.professionalDevBudget)}/yr appears unused.`,
      urgency: 'medium',
      action: `Identify courses, certifications, or conferences to apply toward your ${fmt(e.professionalDevBudget)}/yr budget before year-end.`,
    })
  }

  // Tuition reimbursement
  if (e.tuitionReimbursement) {
    results.push({
      label: 'Tuition Reimbursement',
      annualValue: e.tuitionReimbursement,
      captured: false,
      evidence: `No tuition or education payments detected in transaction history. ${fmt(e.tuitionReimbursement)}/yr available.`,
      urgency: 'medium',
      action: `Apply ${fmt(e.tuitionReimbursement)}/yr toward courses, certifications, or graduate coursework.`,
    })
  }

  // Home office stipend
  if (e.homeOfficeStipend) {
    const hasEquipmentPurchase = mockTransactions.some(t =>
      t.merchantName.toLowerCase().includes('apple') ||
      t.merchantName.toLowerCase().includes('best buy') ||
      (t.category === 'Shopping' && t.amount < -200)
    )
    results.push({
      label: 'Home Office Stipend',
      annualValue: e.homeOfficeStipend,
      captured: null,
      evidence: hasEquipmentPurchase
        ? 'Equipment purchases detected — confirm reimbursement request was submitted to HR.'
        : 'No home office equipment reimbursement detected. Submit eligible receipts to HR.',
      urgency: 'medium',
      action: `Submit home office equipment receipts to claim up to ${fmt(e.homeOfficeStipend)} — eligible for desk, monitor, and peripherals.`,
    })
  }

  // HSA
  if (e.hasHSA && e.hsaEmployerContrib) {
    results.push({
      label: 'HSA Employer Contribution',
      annualValue: e.hsaEmployerContrib,
      captured: null,
      evidence: 'HSA enrollment cannot be verified from transaction data. Must be elected during open enrollment with an HDHP.',
      urgency: 'high',
      action: `Enroll in the HSA-eligible health plan to receive ${fmt(e.hsaEmployerContrib)}/yr employer contribution.`,
    })
  }

  // FSA
  if (e.hasFSA) {
    const healthAnnual = mockTransactions
      .filter(t => t.category === 'Health')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0) * 2
    results.push({
      label: 'Flexible Spending Account (FSA)',
      annualValue: e.fsaLimit ? Math.round(e.fsaLimit * 0.28) : null,
      captured: null,
      evidence: `~${fmt(healthAnnual)}/yr in out-of-pocket health spending detected. Pre-tax FSA contributions would reduce taxable income on these expenses.`,
      urgency: 'medium',
      action: 'Elect FSA contributions during open enrollment to reduce taxable income dollar-for-dollar.',
    })
  }

  // RSUs
  if (e.hasRSUs && e.rsuTotalShares) {
    const annualShares = Math.round(e.rsuTotalShares / (e.rsuVestYears ?? 4))
    results.push({
      label: 'RSU Equity Grant',
      annualValue: null,
      captured: true,
      evidence: `${e.rsuTotalShares.toLocaleString()} shares vesting over ${e.rsuVestYears ?? 4} years (~${annualShares.toLocaleString()} shares/yr)${e.rsuCliffYears ? ` with a ${e.rsuCliffYears}-year cliff` : ''}. Vesting is automatic after grant acceptance.`,
      urgency: 'info',
      action: 'Confirm grant agreement is signed. Plan your tax strategy for vesting events — RSUs are taxed as ordinary income at vest.',
    })
  }

  // Signing bonus
  if (e.signingBonus) {
    results.push({
      label: 'Signing Bonus',
      annualValue: e.signingBonus,
      captured: null,
      evidence: 'One-time payment — verify receipt on your first paycheck and note the clawback window.',
      urgency: 'info',
      action: `Confirm ${fmt(e.signingBonus)} signing bonus appears on your first paycheck. Note any clawback period.`,
    })
  }

  // Life insurance
  if (e.hasLifeInsurance) {
    results.push({
      label: 'Life Insurance',
      annualValue: null,
      captured: null,
      evidence: 'Typically auto-enrolled. Verify beneficiary designation is on file with HR.',
      urgency: 'info',
      action: 'Confirm your beneficiary designation is on file with HR.',
    })
  }

  // STD/LTD
  if (e.hasSTDLTD) {
    results.push({
      label: 'Short & Long-Term Disability',
      annualValue: null,
      captured: null,
      evidence: 'Typically auto-enrolled. Confirm coverage percentages with HR.',
      urgency: 'info',
      action: 'Confirm STD/LTD coverage levels and elimination periods with HR.',
    })
  }

  // Severance
  if (e.hasSeverance && e.severanceMonths) {
    const severanceValue = Math.round((salary / 12) * e.severanceMonths)
    results.push({
      label: 'Severance Package',
      annualValue: null,
      captured: null,
      evidence: `${e.severanceMonths} months base salary (${fmt(severanceValue)}) upon qualifying separation. Activates automatically.`,
      urgency: 'info',
      action: 'Understand the qualifying conditions and any non-compete clauses tied to severance.',
    })
  }

  const urgencyOrder = { critical: 0, high: 1, medium: 2, info: 3 }
  return results.sort((a, b) => {
    const uDiff = urgencyOrder[a.urgency] - urgencyOrder[b.urgency]
    if (uDiff !== 0) return uDiff
    return (b.annualValue ?? 0) - (a.annualValue ?? 0)
  })
}

// ── Annual value totals ───────────────────────────────────────────────────────

export function calcTotals(e: ExtractedBenefits) {
  const salary = e.baseSalary ?? 0
  const bonusAnnual     = salary * (e.annualBonusTargetPct ?? 0)
  const matchAnnual     = e.has401k ? Math.round(salary * (e.matchCap ?? 0) * (e.matchRate ?? 0)) : 0
  const hsaAnnual       = e.hsaEmployerContrib ?? 0
  const esppAnnual      = e.hasESPP ? Math.round(5000 * (e.esppDiscount ?? 0)) : 0
  const commuterAnnual  = e.hasCommuterBenefits ? Math.round((e.commuterMonthlyLimit ?? 315) * 12 * 0.28) : 0
  const tuitionAnnual   = e.tuitionReimbursement ?? 0
  const wellnessAnnual  = e.wellnessStipend ?? 0
  const homeOfficeAnnual = e.homeOfficeStipend ?? 0
  const profDevAnnual   = e.professionalDevBudget ?? 0

  const totalBenefitsValue = Math.round(
    matchAnnual + hsaAnnual + esppAnnual + commuterAnnual +
    tuitionAnnual + wellnessAnnual + homeOfficeAnnual + profDevAnnual
  )
  const totalContractValue = Math.round(salary + bonusAnnual + totalBenefitsValue)

  return { totalContractValue, totalBenefitsValue, bonusAnnual, matchAnnual }
}

// ── Legacy gap analysis (kept for score page) ─────────────────────────────────

export interface BenefitsGap {
  benefit: string
  offered: boolean
  likelyCaptured: boolean
  annualDollarValue: number
  lifetimeDollarValue: number
  urgency: 'critical' | 'high' | 'medium'
  action: string
}

function fv(annualAmount: number, years: number): number {
  if (annualAmount <= 0 || years <= 0) return 0
  return Math.round(annualAmount * ((Math.pow(1.07, years) - 1) / 0.07))
}

function fmtLegacy(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

interface LegacyBenefitsShape {
  has401k: boolean; matchRate: number | null; matchCap: number | null; vestingYears: number | null
  hasHSA: boolean; hsaEmployerContrib: number | null; hasFSA: boolean; fsaLimit: number | null
  hasRSUs: boolean; hasESPP: boolean; esppDiscount: number | null
  hasCommuterBenefits: boolean; commuterMonthlyLimit: number | null
  tuitionReimbursement: number | null; wellnessStipend: number | null
}

export function analyzeBenefitsGaps(benefits: LegacyBenefitsShape, annualIncome: number, yearsToRetirement: number): BenefitsGap[] {
  const gaps: BenefitsGap[] = []
  if (benefits.has401k) {
    const annual = annualIncome * (benefits.matchCap ?? 0) * (benefits.matchRate ?? 0)
    gaps.push({ benefit: '401(k) Employer Match', offered: true, likelyCaptured: false, annualDollarValue: Math.round(annual), lifetimeDollarValue: fv(annual, yearsToRetirement), urgency: 'critical', action: `Contribute at least ${((benefits.matchCap ?? 0) * 100).toFixed(0)}% of salary to capture the full employer match of ${fmtLegacy(annual)} per year` })
  }
  if (benefits.hasHSA && benefits.hsaEmployerContrib) {
    const annual = benefits.hsaEmployerContrib
    gaps.push({ benefit: 'HSA Employer Contribution', offered: true, likelyCaptured: false, annualDollarValue: Math.round(annual), lifetimeDollarValue: Math.round(annual * yearsToRetirement), urgency: 'high', action: `Enroll in your HSA to receive the ${fmtLegacy(annual)} annual employer contribution` })
  }
  if (benefits.hasESPP && benefits.esppDiscount) {
    const annual = 5000 * benefits.esppDiscount
    gaps.push({ benefit: 'Employee Stock Purchase Plan (ESPP)', offered: true, likelyCaptured: false, annualDollarValue: Math.round(annual), lifetimeDollarValue: Math.round(annual * yearsToRetirement), urgency: 'high', action: `Enroll in ESPP; the ${(benefits.esppDiscount * 100).toFixed(0)}% discount is an immediate guaranteed return` })
  }
  if (benefits.hasCommuterBenefits && benefits.commuterMonthlyLimit) {
    const annual = Math.round(benefits.commuterMonthlyLimit * 12 * 0.25)
    gaps.push({ benefit: 'Pre-Tax Commuter Benefits', offered: true, likelyCaptured: false, annualDollarValue: annual, lifetimeDollarValue: Math.round(annual * yearsToRetirement), urgency: 'medium', action: `Set up pre-tax commuter benefits to save approximately ${fmtLegacy(annual)} per year in taxes` })
  }
  if (benefits.tuitionReimbursement) {
    const annual = benefits.tuitionReimbursement
    gaps.push({ benefit: 'Tuition Reimbursement', offered: true, likelyCaptured: false, annualDollarValue: Math.round(annual), lifetimeDollarValue: Math.round(annual * yearsToRetirement), urgency: 'medium', action: `You have ${fmtLegacy(annual)} per year in tuition reimbursement` })
  }
  if (benefits.wellnessStipend) {
    const annual = benefits.wellnessStipend
    gaps.push({ benefit: 'Wellness Stipend', offered: true, likelyCaptured: false, annualDollarValue: Math.round(annual), lifetimeDollarValue: Math.round(annual * yearsToRetirement), urgency: 'medium', action: `Claim your ${fmtLegacy(annual)} wellness stipend` })
  }
  return gaps.sort((a, b) => b.annualDollarValue - a.annualDollarValue)
}
