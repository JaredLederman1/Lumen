'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useDashboard } from '@/lib/dashboardData'
import { useIsMobile } from '@/hooks/useIsMobile'
import { spacing } from '@/lib/theme'
import DataTooltip from '@/components/ui/DataTooltip'

interface Goal {
  id: string
  name: string
  description: string
  target: number
  current: number
  percentage: number
  monthsToTarget: number | null
  monthlyContributionNeeded: number | null
}

interface GoalsData {
  goals: Goal[]
  hasOnboardingProfile: boolean
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

function progressColor(pct: number): string {
  if (pct < 25) return 'var(--color-negative)'
  if (pct < 75) return 'var(--color-gold)'
  return 'var(--color-positive)'
}

const labelStyle = {
  fontFamily: 'var(--font-mono)',
  fontSize: '12px',
  color: 'var(--color-text-muted)',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.12em',
  marginBottom: '4px',
} as const

function GoalCard({ goal, delay }: { goal: Goal; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut', delay }}
      style={{
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-gold-border)',
        borderRadius: '2px',
        padding: '28px',
      }}
    >
      {/* Name + description */}
      <p style={{ fontFamily: 'var(--font-serif)', fontSize: '26px', fontWeight: 400, color: 'var(--color-text)' }}>
        {goal.name}
      </p>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '16px', color: 'var(--color-text-muted)', marginTop: '4px', lineHeight: 1.6 }}>
        {goal.description}
      </p>

      {/* Progress bar */}
      <div style={{
        marginTop: '20px',
        width: '100%', height: '6px',
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderRadius: '2px',
        overflow: 'hidden',
      }}>
        <motion.div
          initial={{ width: '0%' }}
          animate={{ width: `${goal.percentage}%` }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: delay + 0.2 }}
          style={{
            height: '6px',
            borderRadius: '2px',
            backgroundColor: progressColor(goal.percentage),
          }}
        />
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginTop: '16px' }}>
        <div>
          <p style={labelStyle}>Current</p>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '24px', color: 'var(--color-text)', fontWeight: 400 }}>
            <DataTooltip
              value={goal.current}
              title={`${goal.name}: Current`}
              computationNote="Current balance from connected accounts"
              sources={[{ label: 'Account balance', value: goal.current, type: 'sum' as const }]}
            />
          </p>
        </div>
        <div>
          <p style={labelStyle}>Target</p>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '24px', color: 'var(--color-text)', fontWeight: 400 }}>
            <DataTooltip
              value={goal.target}
              title={`${goal.name}: Target`}
              computationNote="Target amount based on your financial profile"
              sources={[{ label: 'Goal target', value: goal.target, type: 'sum' as const }]}
            />
          </p>
        </div>
        <div>
          <p style={labelStyle}>Monthly Needed</p>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '24px', color: 'var(--color-gold)', fontWeight: 400 }}>
            {goal.monthlyContributionNeeded != null ? (
              <DataTooltip
                value={goal.monthlyContributionNeeded}
                title={`${goal.name}: Monthly Needed`}
                computationNote="(Target - Current) / months to goal"
                sources={[
                  { label: 'Remaining gap', value: goal.target - goal.current, type: 'sum' as const },
                  { label: 'Monthly contribution', value: goal.monthlyContributionNeeded, type: 'average' as const },
                ]}
              />
            ) : '--'}
          </p>
        </div>
      </div>
    </motion.div>
  )
}

function useGoalsData() {
  const { authToken } = useDashboard()
  const [data, setData] = useState<GoalsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const headers: Record<string, string> = authToken ? { Authorization: `Bearer ${authToken}` } : {}
    fetch('/api/goals', { headers })
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [authToken])

  return { data, loading }
}

function GoalsDesktop() {
  const { data, loading } = useGoalsData()

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '320px' }}>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', color: 'var(--color-text-muted)', letterSpacing: '0.06em' }}>
          Loading...
        </p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <p style={{ fontFamily: 'var(--font-serif)', fontSize: '29px', fontWeight: 400, color: 'var(--color-text)' }}>
          Goals
        </p>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--color-text-muted)' }}>
          Goals are derived from your connected accounts and financial profile.
        </p>
      </div>

      {/* No onboarding banner */}
      {data && !data.hasOnboardingProfile && (
        <div style={{
          backgroundColor: 'var(--color-info-bg)',
          border: '1px solid var(--color-info-border)',
          borderRadius: '2px',
          padding: '14px 18px',
          display: 'flex', alignItems: 'center', gap: '6px',
        }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', color: 'var(--color-info)' }}>
            Complete your financial profile to unlock all goal projections.{' '}
            <Link
              href="/dashboard/profile"
              style={{ color: 'var(--color-gold)', textDecoration: 'underline', textUnderlineOffset: '2px' }}
            >
              Go to Profile
            </Link>
          </p>
        </div>
      )}

      {/* Goal cards */}
      {data && data.goals.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {data.goals.map((goal, i) => (
            <GoalCard key={goal.id} goal={goal} delay={i * 0.08} />
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '200px' }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', color: 'var(--color-text-muted)' }}>
            Connect accounts to generate goal projections.
          </p>
        </div>
      )}
    </div>
  )
}

function GoalsMobile() {
  const { data, loading } = useGoalsData()

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '320px' }}>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', color: 'var(--color-text-muted)', letterSpacing: '0.06em' }}>
          Loading...
        </p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <p style={{ fontFamily: 'var(--font-serif)', fontSize: '29px', fontWeight: 400, color: 'var(--color-text)' }}>
        Goals
      </p>

      {/* No onboarding banner */}
      {data && !data.hasOnboardingProfile && (
        <div style={{
          backgroundColor: 'var(--color-info-bg)',
          border: '1px solid var(--color-info-border)',
          borderRadius: '2px',
          padding: '14px 18px',
        }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', color: 'var(--color-info)' }}>
            Complete your financial profile to unlock all goal projections.{' '}
            <Link
              href="/dashboard/profile"
              style={{ color: 'var(--color-gold)', textDecoration: 'underline', textUnderlineOffset: '2px' }}
            >
              Go to Profile
            </Link>
          </p>
        </div>
      )}

      {/* Goal cards stacked */}
      {data && data.goals.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sectionGap }}>
          {data.goals.map((goal, i) => (
            <GoalCard key={goal.id} goal={goal} delay={i * 0.08} />
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '200px' }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', color: 'var(--color-text-muted)' }}>
            Connect accounts to generate goal projections.
          </p>
        </div>
      )}
    </div>
  )
}

export default function GoalsPage() {
  const isMobile = useIsMobile()
  return isMobile ? <GoalsMobile /> : <GoalsDesktop />
}
