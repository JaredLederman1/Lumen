'use client'

import { CSSProperties } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useCashflowQuery } from '@/lib/queries'
import WidgetCard from './WidgetCard'
import WidgetSkeleton, { WIDGET_REVEAL } from './WidgetSkeleton'

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
  textTransform: 'lowercase',
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
}

const emptyCopy: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '12px',
  color: 'var(--color-text-muted)',
  margin: 0,
}

const fmtCurrency = (n: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Math.max(0, Math.round(n)))

export default function SpendingDonutWidget() {
  const { data, isPending } = useCashflowQuery()
  if (isPending) return <WidgetSkeleton variant="metric" />
  const spendingByCategory = data?.spendingByCategory ?? []

  if (!spendingByCategory || spendingByCategory.length === 0) {
    return (
      <WidgetCard
        variant="metric"
        eyebrow="Spending by category"
        columns={[{ caption: 'Last 30 days', hero: fmtCurrency(0), captionPosition: 'below' }]}
        secondary={<p style={emptyCopy}>No expense transactions in the last 30 days.</p>}
        cta={
          <Link href="/dashboard/cashflow" style={ctaLink}>
            See breakdown &rarr;
          </Link>
        }
      />
    )
  }

  const total = spendingByCategory.reduce((s, d) => s + d.amount, 0)
  const ranked = [...spendingByCategory].sort((a, b) => b.amount - a.amount)
  const topForLegend = ranked.slice(0, MAX_LEGEND_ITEMS)
  const hiddenCount = Math.max(0, ranked.length - MAX_LEGEND_ITEMS)

  return (
    <motion.div {...WIDGET_REVEAL}>
      <WidgetCard
        variant="metric"
        eyebrow="Spending by category"
        columns={[{ caption: 'Last 30 days', hero: fmtCurrency(total), captionPosition: 'below' }]}
        secondary={
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
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
          </div>
        }
        cta={
          <Link href="/dashboard/cashflow" style={ctaLink}>
            {hiddenCount > 0 ? `See all ${ranked.length} categories` : 'See breakdown'} &rarr;
          </Link>
        }
      />
    </motion.div>
  )
}
