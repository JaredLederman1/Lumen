'use client'

import { motion } from 'framer-motion'
import type { DashboardState, HeroMetrics } from '@/lib/dashboardState'
import HeroPreLink from './hero/HeroPreLink'
import HeroLiabilityOnly from './hero/HeroLiabilityOnly'
import HeroDebtDominant from './hero/HeroDebtDominant'
import HeroFoundation from './hero/HeroFoundation'
import HeroMatchGap from './hero/HeroMatchGap'
import HeroOptimizing from './hero/HeroOptimizing'
import HeroSpendingLeak from './hero/HeroSpendingLeak'
import HeroOptimized from './hero/HeroOptimized'

interface HeroRowProps {
  state: DashboardState | null
  metrics: HeroMetrics
  loading?: boolean
}

const placeholderStyle: React.CSSProperties = {
  backgroundColor: 'var(--color-surface)',
  border: '1px solid var(--color-gold-border)',
  borderRadius: 'var(--radius-lg)',
  padding: '32px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-start',
  minHeight: '180px',
}

const placeholderText: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '13px',
  color: 'var(--color-text-muted)',
  letterSpacing: '0.06em',
  margin: 0,
}

export default function HeroRow({ state, metrics, loading }: HeroRowProps) {
  if (loading || !state) {
    return (
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.25 }}
        style={placeholderStyle}
      >
        <p style={placeholderText}>Loading your dashboard…</p>
      </motion.section>
    )
  }

  switch (state) {
    case 'PRE_LINK':
      return <HeroPreLink />
    case 'LIABILITY_ONLY':
      return <HeroLiabilityOnly />
    case 'DEBT_DOMINANT':
      return (
        <HeroDebtDominant
          annualInterestCost={metrics.annualInterestCost ?? 0}
        />
      )
    case 'FOUNDATION':
      return (
        <HeroFoundation
          emergencyFundMonths={metrics.emergencyFundMonths ?? 0}
          emergencyFundTargetMonths={metrics.emergencyFundTargetMonths ?? 6}
        />
      )
    case 'MATCH_GAP':
      return <HeroMatchGap annualMatchGap={metrics.matchGapAnnual ?? 0} />
    case 'OPTIMIZING':
      return (
        <HeroOptimizing
          remainingTaxAdvantagedCapacity={metrics.remainingTaxAdvantagedCapacity ?? 0}
        />
      )
    case 'SPENDING_LEAK':
      return (
        <HeroSpendingLeak
          top3DiscretionaryShare={metrics.discretionaryConcentrationPct ?? 0}
        />
      )
    case 'OPTIMIZED':
      return <HeroOptimized netWorth={metrics.netWorth ?? 0} />
    default:
      return null
  }
}
