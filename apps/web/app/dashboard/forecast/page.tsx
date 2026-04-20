'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import ForecastChart from '@/components/ui/ForecastChart'
import DataTooltip from '@/components/ui/DataTooltip'
import { useDashboard } from '@/lib/dashboardData'
import { useIsMobile } from '@/hooks/useIsMobile'
import MobileCard from '@/components/ui/MobileCard'
import MobileMetricCard from '@/components/ui/MobileMetricCard'
import { colors, fonts, spacing } from '@/lib/theme'

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

const card = {
  backgroundColor: 'var(--color-surface)',
  border: '1px solid var(--color-gold-border)',
  borderRadius: 'var(--radius-lg)',
  padding: '28px',
} as const

const sectionLabel = {
  fontFamily: 'var(--font-sans)',
  fontSize: '11px',
  fontWeight: 500,
  color: 'var(--color-text-muted)',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.06em',
  marginBottom: '22px',
} as const

function ForecastDesktop() {
  const { loading, forecast } = useDashboard()

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '320px' }}>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', color: '#6B7A8D', letterSpacing: '0.06em' }}>Loading...</p>
      </div>
    )
  }

  if (!forecast) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px', gap: '20px', textAlign: 'center' }}
      >
        <div style={{ width: '48px', height: '48px', borderRadius: '50%', border: '1px solid rgba(184,145,58,0.25)', backgroundColor: 'rgba(184,145,58,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
          ◈
        </div>
        <div>
          <p style={{ fontFamily: 'var(--font-serif)', fontSize: '26px', fontWeight: 400, color: '#F0F2F8', marginBottom: '8px' }}>No forecast data</p>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', color: '#6B7A8D', lineHeight: 1.7 }}>Connect a bank account to generate a 6-month cash flow projection.</p>
        </div>
        <Link href="/dashboard/accounts" style={{ padding: '10px 24px', backgroundColor: '#B8913A', border: 'none', borderRadius: '2px', color: '#F0F2F8', fontFamily: 'var(--font-mono)', fontSize: '13px', letterSpacing: '0.08em', textDecoration: 'none', display: 'inline-block' }}>
          Connect an Account
        </Link>
      </motion.div>
    )
  }

  const { avgIncome, avgExpenses, avgSavings, checkingBalance, emergencyFundMonths, historicalMonths, projectedMonths } = forecast
  const forecastData = [...historicalMonths, ...projectedMonths]

  const summaryCards = [
    {
      label: 'Emergency Fund Balance',
      value: checkingBalance,
      color: '#F0F2F8',
      tooltipTitle: 'Emergency Fund Balance',
      tooltipNote: 'Total liquid balance across checking and savings accounts',
      tooltipSources: [{
        label: 'Liquid account balances',
        value: checkingBalance,
        type: 'computed' as const,
        detail: 'Checking + savings accounts',
      }],
    },
    {
      label: 'Avg Monthly Income',
      value: avgIncome,
      color: '#4CAF7D',
      tooltipTitle: 'Avg Monthly Income',
      tooltipNote: 'Average monthly income over the last 6 months',
      tooltipSources: [{
        label: 'Monthly average, last 6 months',
        value: avgIncome,
        type: 'average' as const,
        detail: 'Based on positive transaction amounts',
      }],
    },
    {
      label: 'Avg Monthly Expenses',
      value: avgExpenses,
      color: '#E05C6E',
      tooltipTitle: 'Avg Monthly Expenses',
      tooltipNote: 'Average monthly spending over the last 6 months',
      tooltipSources: [{
        label: 'Monthly average, last 6 months',
        value: avgExpenses,
        type: 'average' as const,
        detail: 'Based on negative transaction amounts',
      }],
    },
    {
      label: 'Avg Monthly Savings',
      value: avgSavings,
      color: '#B8913A',
      tooltipTitle: 'Avg Monthly Savings',
      tooltipNote: 'Average income minus average expenses',
      tooltipSources: [
        { label: 'Avg Income', value: avgIncome, type: 'average' as const },
        { label: 'Avg Expenses', value: -avgExpenses, type: 'average' as const },
      ],
    },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        {summaryCards.map(({ label, value, color, tooltipTitle, tooltipNote, tooltipSources }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut', delay: i * 0.06 }}
            style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-gold-border)', borderRadius: 'var(--radius-lg)', padding: '24px' }}
          >
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: '#6B7A8D', textTransform: 'uppercase', letterSpacing: '0.16em', marginBottom: '10px' }}>{label}</p>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '41px', fontWeight: 400, color }}>
              <DataTooltip
                value={value}
                title={tooltipTitle}
                computationNote={tooltipNote}
                sources={tooltipSources}
              />
            </p>
          </motion.div>
        ))}
      </div>

      <div style={card}>
        <p style={sectionLabel}>Checking Balance: 6-Month Projection</p>
        <ForecastChart data={forecastData} emergencyFundMonths={emergencyFundMonths} />
      </div>
    </div>
  )
}

function ForecastMobile() {
  const { loading, forecast } = useDashboard()

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '320px' }}>
        <p style={{ fontFamily: fonts.mono, fontSize: '14px', color: colors.textMuted, letterSpacing: '0.06em' }}>
          Loading...
        </p>
      </div>
    )
  }

  if (!forecast) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px', gap: spacing.sectionGap, textAlign: 'center' }}
      >
        <div style={{ width: '48px', height: '48px', borderRadius: '50%', border: `1px solid ${colors.goldBorder}`, backgroundColor: colors.goldSubtle, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
          ◈
        </div>
        <div>
          <p style={{ fontFamily: fonts.serif, fontSize: '26px', fontWeight: 400, color: colors.text, marginBottom: '8px' }}>No forecast data</p>
          <p style={{ fontFamily: fonts.mono, fontSize: '14px', color: colors.textMuted, lineHeight: 1.7 }}>Connect a bank account to generate a 6-month cash flow projection.</p>
        </div>
        <Link
          href="/dashboard/accounts"
          style={{ padding: '12px 24px', minHeight: spacing.tapTarget, backgroundColor: colors.gold, border: 'none', borderRadius: '2px', color: colors.text, fontFamily: fonts.mono, fontSize: '13px', letterSpacing: '0.08em', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
        >
          Connect an Account
        </Link>
      </motion.div>
    )
  }

  const { avgIncome, avgExpenses, avgSavings, checkingBalance, emergencyFundMonths, historicalMonths, projectedMonths } = forecast
  const forecastData = [...historicalMonths, ...projectedMonths]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sectionGap }}>
      {/* Summary metrics stacked vertically */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut', delay: 0 }}
      >
        <MobileMetricCard
          label="Emergency Fund Balance"
          value={fmt(checkingBalance)}
          valueColor={colors.text}
        />
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut', delay: 0.06 }}
      >
        <MobileMetricCard
          label="Avg Monthly Income"
          value={fmt(avgIncome)}
          valueColor={colors.positive}
        />
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut', delay: 0.12 }}
      >
        <MobileMetricCard
          label="Avg Monthly Expenses"
          value={fmt(avgExpenses)}
          valueColor={colors.negative}
        />
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut', delay: 0.18 }}
      >
        <MobileMetricCard
          label="Avg Monthly Savings"
          value={fmt(avgSavings)}
          valueColor={colors.gold}
        />
      </motion.div>

      {/* Forecast chart */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut', delay: 0.24 }}
      >
        <MobileCard>
          <p style={{ fontFamily: fonts.mono, fontSize: '11px', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.16em', marginBottom: spacing.tightGap }}>
            6-Month Projection
          </p>
          <ForecastChart data={forecastData} emergencyFundMonths={emergencyFundMonths} height={200} />
        </MobileCard>
      </motion.div>
    </div>
  )
}

export default function ForecastPage() {
  const isMobile = useIsMobile()
  return isMobile ? <ForecastMobile /> : <ForecastDesktop />
}
