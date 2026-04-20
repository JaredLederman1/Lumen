'use client'

import Link from 'next/link'
import { useGoalsQuery } from '@/lib/queries'
import WidgetCard from './WidgetCard'

interface Goal {
  id: string
  name: string
  percentage: number
}

export default function GoalsProgressWidget() {
  const { data } = useGoalsQuery<Goal>()
  const goals = data?.goals ?? null

  return (
    <WidgetCard label="Goals progress" title="Your milestones">
      {goals == null ? (
        <p
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '12px',
            color: 'var(--color-text-muted)',
            margin: 0,
          }}
        >
          Loading…
        </p>
      ) : goals.length === 0 ? (
        <p
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '12px',
            color: 'var(--color-text-muted)',
            margin: 0,
          }}
        >
          Finish onboarding to see goal tracking.
        </p>
      ) : (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
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
                <span>{Math.round(g.percentage)}%</span>
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
      <Link
        href="/dashboard/goals"
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          letterSpacing: '0.08em',
          color: 'var(--color-gold)',
          textDecoration: 'none',
          alignSelf: 'flex-start',
        }}
      >
        View all →
      </Link>
    </WidgetCard>
  )
}
