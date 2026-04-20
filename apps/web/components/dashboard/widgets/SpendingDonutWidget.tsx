'use client'

import { CSSProperties } from 'react'
import Link from 'next/link'
import { useDashboard } from '@/lib/dashboardData'
import WidgetCard from './WidgetCard'

// Spending category palette. Uses CSS custom properties from globals.css so
// the widget respects theme tokens and the hover/focus states stay consistent
// with the rest of the dashboard.
const PALETTE = [
  'var(--color-gold)',
  'var(--color-positive)',
  'var(--color-info)',
  'var(--color-text-mid)',
  'var(--color-gold-subtle)',
  'var(--color-text-muted)',
] as const

const MAX_LEGEND_ITEMS = 4

// ── Styles ──────────────────────────────────────────────────────────────────

const shellStyle: CSSProperties = {
  minHeight: '260px',
  maxHeight: '340px',
  overflow: 'hidden',
}

const heroLabel: CSSProperties = {
  fontFamily: 'var(--font-sans)',
  fontSize: '11px',
  fontWeight: 500,
  color: 'var(--color-text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  margin: 0,
}

const heroValue: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '28px',
  color: 'var(--color-text)',
  letterSpacing: '-0.01em',
  lineHeight: 1.05,
  margin: 0,
}

const barTrack: CSSProperties = {
  display: 'flex',
  height: '8px',
  width: '100%',
  borderRadius: 'var(--radius-pill)',
  overflow: 'hidden',
  backgroundColor: 'var(--color-surface-texture)',
}

const legendGrid: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, 1fr)',
  columnGap: '18px',
  rowGap: '8px',
}

const legendRow: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '10px',
  minWidth: 0,
}

const legendLeft: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  minWidth: 0,
  flex: 1,
}

const legendSwatch: CSSProperties = {
  width: '8px',
  height: '8px',
  borderRadius: 'var(--radius-pill)',
  flexShrink: 0,
}

const legendLabel: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '12px',
  color: 'var(--color-text-mid)',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
}

const legendShare: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '12px',
  color: 'var(--color-text)',
  flexShrink: 0,
}

const ctaLink: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '11px',
  letterSpacing: '0.08em',
  color: 'var(--color-gold)',
  textDecoration: 'none',
  marginTop: 'auto',
  alignSelf: 'flex-start',
}

const fmtCurrency = (n: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Math.max(0, Math.round(n)))

// ── Component ───────────────────────────────────────────────────────────────

export default function SpendingDonutWidget() {
  const { spendingByCategory } = useDashboard()

  if (!spendingByCategory || spendingByCategory.length === 0) {
    return (
      <WidgetCard
        label="Spending by category"
        title="Last 30 days"
        subtitle="No expense transactions in the last 30 days."
        style={shellStyle}
      >
        <Link href="/dashboard/cashflow" style={ctaLink}>
          See breakdown &rarr;
        </Link>
      </WidgetCard>
    )
  }

  const total = spendingByCategory.reduce((s, d) => s + d.amount, 0)
  const ranked = [...spendingByCategory].sort((a, b) => b.amount - a.amount)
  const topForLegend = ranked.slice(0, MAX_LEGEND_ITEMS)
  const hiddenCount = Math.max(0, ranked.length - MAX_LEGEND_ITEMS)

  return (
    <WidgetCard label="Spending by category" style={shellStyle}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-label-to-value)' }}>
        <p style={heroLabel}>Last 30 days</p>
        <p style={heroValue}>{fmtCurrency(total)}</p>
      </div>

      <div style={barTrack} role="img" aria-label="Category share of spending">
        {ranked.map((item, i) => {
          const share = total > 0 ? (item.amount / total) * 100 : 0
          return (
            <div
              key={item.category}
              style={{
                width: `${share}%`,
                backgroundColor: PALETTE[i % PALETTE.length],
              }}
            />
          )
        })}
      </div>

      <div style={legendGrid}>
        {topForLegend.map((item, i) => {
          const share = total > 0 ? (item.amount / total) * 100 : 0
          return (
            <div key={item.category} style={legendRow}>
              <div style={legendLeft}>
                <div style={{ ...legendSwatch, backgroundColor: PALETTE[i % PALETTE.length] }} />
                <span style={legendLabel}>{item.category}</span>
              </div>
              <span style={legendShare}>{share.toFixed(0)}%</span>
            </div>
          )
        })}
      </div>

      <Link href="/dashboard/cashflow" style={ctaLink}>
        {hiddenCount > 0 ? `See all ${ranked.length} categories` : 'See breakdown'} &rarr;
      </Link>
    </WidgetCard>
  )
}
