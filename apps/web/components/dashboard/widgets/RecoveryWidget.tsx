'use client'

import { CSSProperties } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useRecoveryQuery, useOnboardingProfileQuery } from '@/lib/queries'
import WidgetCard from './WidgetCard'
import WidgetSkeleton, { WIDGET_REVEAL } from './WidgetSkeleton'

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Math.max(0, Math.round(n)))
}

const ctaLink: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '11px',
  letterSpacing: '0.08em',
  color: 'var(--color-gold)',
  textDecoration: 'none',
}

const secondaryLine: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '12px',
  color: 'var(--color-text-mid)',
  margin: 0,
}

export default function RecoveryWidget() {
  const { data, isPending } = useRecoveryQuery()
  const { data: profile, isPending: profilePending } = useOnboardingProfileQuery()
  if (isPending || profilePending) return <WidgetSkeleton variant="metric" />
  const open = data?.open ?? null
  const recovered = data?.recovered ?? null
  const openCount = data?.gaps.filter(g => g.status === 'open').length ?? 0

  if (profile && !profile.completedAt) {
    return (
      <WidgetCard
        variant="metric"
        eyebrow="Recovery counter"
        columns={[{ caption: 'Needs profile', hero: '—' }]}
        secondary={<p style={secondaryLine}>Complete your profile to see this.</p>}
        cta={
          <Link href="/onboarding" style={ctaLink}>
            Resume onboarding &rarr;
          </Link>
        }
      />
    )
  }

  const heroDisplay = open != null ? fmt(open) : '—'

  return (
    <motion.div {...WIDGET_REVEAL}>
      <WidgetCard
        variant="metric"
        eyebrow="Recovery counter"
        columns={[
          {
            caption: 'Open gaps',
            hero: heroDisplay,
            heroColor: open != null && open > 0 ? 'var(--color-negative)' : undefined,
          },
        ]}
        secondary={
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <p style={secondaryLine}>
              Recovered: {recovered != null ? fmt(recovered) : '—'}
            </p>
            <p style={secondaryLine}>
              {openCount === 0
                ? 'No open gaps detected.'
                : openCount === 1
                  ? '1 open gap'
                  : `${openCount} open gaps`}
            </p>
          </div>
        }
        cta={
          <Link href="/dashboard/recovery" style={ctaLink}>
            Open recovery &rarr;
          </Link>
        }
      />
    </motion.div>
  )
}
