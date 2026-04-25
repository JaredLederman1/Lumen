'use client'

import { CSSProperties } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useGoalsQuery, useOnboardingProfileQuery } from '@/lib/queries'
import WidgetCard from './WidgetCard'
import WidgetSkeleton, { WIDGET_REVEAL } from './WidgetSkeleton'

interface Goal {
  id: string
  name: string
  percentage: number
}

const ctaLink: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '11px',
  letterSpacing: '0.08em',
  color: 'var(--color-gold)',
  textDecoration: 'none',
}

const emptyCopy: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '12px',
  color: 'var(--color-text-muted)',
  margin: 0,
}

export default function GoalsProgressWidget() {
  const { data, isPending } = useGoalsQuery<Goal>()
  const { data: profile, isPending: profilePending } = useOnboardingProfileQuery()
  if (isPending || profilePending) return <WidgetSkeleton variant="list" />
  const goals = data?.goals ?? null
  const gated = profile && !profile.completedAt

  return (
    <motion.div {...WIDGET_REVEAL}>
    <WidgetCard
      variant="list"
      eyebrow="Goals progress"
      cta={
        <Link
          href={gated ? '/onboarding' : '/dashboard/goals'}
          style={ctaLink}
        >
          {gated ? 'Resume onboarding' : 'View all'} &rarr;
        </Link>
      }
    >
      {gated ? (
        <p style={emptyCopy}>Complete your profile to see this.</p>
      ) : goals == null ? (
        <p style={emptyCopy}>Loading…</p>
      ) : goals.length === 0 ? (
        <p style={emptyCopy}>Finish onboarding to see goal tracking.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {goals.slice(0, 3).map(g => (
            <div key={g.id}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '12px',
                  color: 'var(--color-text-mid)',
                  marginBottom: '4px',
                }}
              >
                <span>{g.name}</span>
                <span style={{ fontFamily: 'var(--font-mono)' }}>
                  {Math.round(g.percentage)}%
                </span>
              </div>
              <div
                style={{
                  height: '4px',
                  backgroundColor: 'var(--color-gold-subtle)',
                  borderRadius: 'var(--radius-pill)',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${Math.min(100, g.percentage)}%`,
                    backgroundColor: 'var(--color-gold)',
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </WidgetCard>
    </motion.div>
  )
}
