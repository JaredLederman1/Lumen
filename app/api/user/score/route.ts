import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { analyzeBenefitsGaps } from '@/lib/benefitsAnalysis'
import type { ScoreReport, ScoreDimension, Finding } from '@/lib/scoring'

export async function GET(request: NextRequest) {
  try {
    // Auth via Authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const token = authHeader.slice(7)

    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const [profile, benefits] = await Promise.all([
      prisma.onboardingProfile.findUnique({ where: { userId: user.id } }),
      prisma.employmentBenefits.findUnique({ where: { userId: user.id } }),
    ])

    const annualIncome      = profile?.annualIncome ?? 150000
    const age               = profile?.age ?? 30
    const retirementAge     = profile?.retirementAge ?? 65
    const yearsToRetirement = Math.max(1, retirementAge - age)

    const findings: Finding[] = []
    const dimensions: ScoreDimension[] = []

    // Benefits dimension
    if (benefits) {
      const gaps = analyzeBenefitsGaps(benefits, annualIncome, yearsToRetirement)
      const benefitsFindings: Finding[] = gaps.map(g => ({
        type:              g.urgency === 'critical' ? 'critical' : g.urgency === 'high' ? 'warning' : 'info',
        title:             g.benefit,
        description:       g.action,
        dollarImpact:      g.annualDollarValue,
        impactDescription: `${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(g.annualDollarValue)}/yr · ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(g.lifetimeDollarValue)} lifetime`,
      }))
      findings.push(...benefitsFindings)

      const totalValue    = benefits.totalAnnualValue ?? 0
      const capturedValue = benefits.capturedAnnualValue ?? 0
      const benefitsScore = totalValue > 0 ? Math.round((capturedValue / totalValue) * 100) : 50

      dimensions.push({
        name:     'Benefits Utilization',
        score:    benefitsScore,
        weight:   0.4,
        findings: benefitsFindings,
      })
    }

    // Savings rate dimension
    if (profile) {
      const savingsFindings: Finding[] = []
      const savingsScore = profile.savingsRate >= 0.2 ? 90
        : profile.savingsRate >= 0.15 ? 70
        : profile.savingsRate >= 0.10 ? 50
        : 30

      if (profile.savingsRate < 0.15) {
        const gapRate   = 0.2 - profile.savingsRate
        const gapAnnual = Math.round(annualIncome * gapRate)
        savingsFindings.push({
          type:              profile.savingsRate < 0.1 ? 'critical' : 'warning',
          title:             'Savings Rate Below Target',
          description:       `Your current savings rate of ${(profile.savingsRate * 100).toFixed(0)}% is below the recommended 20%. Increasing to 20% would add ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(gapAnnual)} per year to your wealth-building.`,
          dollarImpact:      gapAnnual,
          impactDescription: `${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(gapAnnual)}/yr opportunity`,
        })
        findings.push(...savingsFindings)
      }

      dimensions.push({
        name:     'Savings Rate',
        score:    savingsScore,
        weight:   0.35,
        findings: savingsFindings,
      })
    }

    // Retirement planning dimension (stub)
    dimensions.push({
      name:     'Retirement Planning',
      score:    benefits?.has401k ? 65 : 40,
      weight:   0.25,
      findings: [],
    })

    const overallScore = dimensions.length > 0
      ? Math.round(dimensions.reduce((sum, d) => sum + d.score * d.weight, 0) / dimensions.reduce((sum, d) => sum + d.weight, 0))
      : 50

    const report: ScoreReport = {
      overallScore,
      dimensions,
      findings: findings.sort((a, b) => {
        const order = { critical: 0, warning: 1, info: 2 }
        return order[a.type] - order[b.type]
      }),
      generatedAt: new Date(),
    }

    return NextResponse.json({ report })
  } catch (error) {
    console.error('[user/score]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
