'use client'

import { CSSProperties } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import WidgetCard from './WidgetCard'
import WidgetSkeleton, { WIDGET_REVEAL } from './WidgetSkeleton'
import { useOpportunityQuery, useOnboardingProfileQuery } from '@/lib/queries'
import type { OpportunityData } from '@/app/api/opportunity/route'

const ctaLink: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '11px',
  letterSpacing: '0.08em',
  color: 'var(--color-gold)',
  textDecoration: 'none',
}

const contextCopy: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '12px',
  color: 'var(--color-text-mid)',
  lineHeight: 1.55,
  margin: 0,
}

const fmtCurrency = (n: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Math.max(0, Math.round(n)))

export default function OpportunityCostWidget() {
  const { data: raw, isPending } = useOpportunityQuery<OpportunityData>()
  const { data: profile, isPending: profilePending } = useOnboardingProfileQuery()

  if (isPending || profilePending) {
    return <WidgetSkeleton variant="metric" />
  }

  const data = raw && typeof raw.idleCash === 'number' ? raw : null

  const cta = (
    <Link href="/dashboard/opportunity" style={ctaLink}>
      Open calculator &rarr;
    </Link>
  )

  if (profile && !profile.completedAt) {
    return (
      <WidgetCard
        variant="metric"
        eyebrow="Opportunity cost"
        columns={[{ caption: 'Needs profile', hero: '—', captionPosition: 'below' }]}
        secondary={<p style={contextCopy}>Complete your profile to see this.</p>}
        cta={
          <Link href="/onboarding" style={ctaLink}>
            Resume onboarding &rarr;
          </Link>
        }
      />
    )
  }

  if (!data || data.idleCash <= 0) {
    return (
      <WidgetCard
        variant="metric"
        eyebrow="Opportunity cost"
        columns={[{ caption: 'Idle above buffer', hero: fmtCurrency(0), captionPosition: 'below' }]}
        secondary={
          <p style={contextCopy}>
            Your liquid cash is close to your 3-month buffer, so there is nothing obvious to redeploy right now.
          </p>
        }
        cta={cta}
      />
    )
  }

  return (
    <motion.div {...WIDGET_REVEAL}>
      <WidgetCard
        variant="metric"
        eyebrow="Opportunity cost"
        columns={[
          {
            caption: '10-year foregone growth',
            hero: fmtCurrency(data.tenYearCost),
            captionPosition: 'below',
          },
        ]}
        secondary={
          <p style={contextCopy}>
            {fmtCurrency(data.idleCash)} parked above your 3-month buffer compounds to the hero figure at a 7% historical return over ten years.
          </p>
        }
        cta={cta}
      />
    </motion.div>
  )
}
