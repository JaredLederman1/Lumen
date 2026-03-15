// Types -----------------------------------------------------------------------

export interface BenefitsGap {
  benefit: string
  offered: boolean
  likelyCaptured: boolean
  annualDollarValue: number
  lifetimeDollarValue: number
  urgency: 'critical' | 'high' | 'medium'
  action: string
}

interface EmploymentBenefitsShape {
  has401k: boolean
  matchRate: number | null
  matchCap: number | null
  vestingYears: number | null
  hasHSA: boolean
  hsaEmployerContrib: number | null
  hasFSA: boolean
  fsaLimit: number | null
  hasRSUs: boolean
  hasESPP: boolean
  esppDiscount: number | null
  hasCommuterBenefits: boolean
  commuterMonthlyLimit: number | null
  tuitionReimbursement: number | null
  wellnessStipend: number | null
}

// Helpers ---------------------------------------------------------------------

function fv(annualAmount: number, years: number): number {
  if (annualAmount <= 0 || years <= 0) return 0
  return Math.round(annualAmount * ((Math.pow(1.07, years) - 1) / 0.07))
}

function fmt(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', maximumFractionDigits: 0,
  }).format(n)
}

// Main function ---------------------------------------------------------------

export function analyzeBenefitsGaps(
  benefits: EmploymentBenefitsShape,
  annualIncome: number,
  yearsToRetirement: number,
): BenefitsGap[] {
  const gaps: BenefitsGap[] = []

  // 401(k) match --------------------------------------------------------------
  if (benefits.has401k) {
    const annual = annualIncome * (benefits.matchCap ?? 0) * (benefits.matchRate ?? 0)
    const lifetime = fv(annual, yearsToRetirement)
    const capPct = ((benefits.matchCap ?? 0) * 100).toFixed(0)
    gaps.push({
      benefit: '401(k) Employer Match',
      offered: true,
      likelyCaptured: false, // cannot verify without live account data
      annualDollarValue: Math.round(annual),
      lifetimeDollarValue: lifetime,
      urgency: 'critical',
      action: `Increase your 401(k) contribution to at least ${capPct}% of salary to capture the full employer match of ${fmt(annual)} per year`,
    })
  }

  // HSA employer contribution -------------------------------------------------
  if (benefits.hasHSA && benefits.hsaEmployerContrib) {
    const annual = benefits.hsaEmployerContrib
    const lifetime = annual * yearsToRetirement
    gaps.push({
      benefit: 'HSA Employer Contribution',
      offered: true,
      likelyCaptured: false,
      annualDollarValue: Math.round(annual),
      lifetimeDollarValue: Math.round(lifetime),
      urgency: 'high',
      action: `Enroll in your HSA to receive the ${fmt(annual)} annual employer contribution; this is free money added directly to your account`,
    })
  }

  // ESPP ----------------------------------------------------------------------
  if (benefits.hasESPP && benefits.esppDiscount) {
    const annual = 5000 * benefits.esppDiscount
    const lifetime = annual * yearsToRetirement
    const discountPct = (benefits.esppDiscount * 100).toFixed(0)
    gaps.push({
      benefit: 'Employee Stock Purchase Plan (ESPP)',
      offered: true,
      likelyCaptured: false,
      annualDollarValue: Math.round(annual),
      lifetimeDollarValue: Math.round(lifetime),
      urgency: 'high',
      action: `Enroll in ESPP; the ${discountPct}% discount represents an immediate guaranteed return on every dollar contributed`,
    })
  }

  // Commuter benefits ---------------------------------------------------------
  if (benefits.hasCommuterBenefits && benefits.commuterMonthlyLimit) {
    const annual = Math.round(benefits.commuterMonthlyLimit * 12 * 0.25)
    const lifetime = annual * yearsToRetirement
    gaps.push({
      benefit: 'Pre-Tax Commuter Benefits',
      offered: true,
      likelyCaptured: false,
      annualDollarValue: annual,
      lifetimeDollarValue: Math.round(lifetime),
      urgency: 'medium',
      action: `Set up pre-tax commuter benefits to save approximately ${fmt(annual)} per year in taxes`,
    })
  }

  // Tuition reimbursement -----------------------------------------------------
  if (benefits.tuitionReimbursement) {
    const annual = benefits.tuitionReimbursement
    const lifetime = annual * yearsToRetirement
    gaps.push({
      benefit: 'Tuition Reimbursement',
      offered: true,
      likelyCaptured: false,
      annualDollarValue: Math.round(annual),
      lifetimeDollarValue: Math.round(lifetime),
      urgency: 'medium',
      action: `You have ${fmt(annual)} per year in tuition reimbursement; apply this toward courses, certifications, or a graduate degree`,
    })
  }

  // Wellness stipend ----------------------------------------------------------
  if (benefits.wellnessStipend) {
    const annual = benefits.wellnessStipend
    const lifetime = annual * yearsToRetirement
    gaps.push({
      benefit: 'Wellness Stipend',
      offered: true,
      likelyCaptured: false,
      annualDollarValue: Math.round(annual),
      lifetimeDollarValue: Math.round(lifetime),
      urgency: 'medium',
      action: `Claim your ${fmt(annual)} wellness stipend; check HR documentation for eligible expenses`,
    })
  }

  // Sort by annual value descending
  return gaps.sort((a, b) => b.annualDollarValue - a.annualDollarValue)
}
