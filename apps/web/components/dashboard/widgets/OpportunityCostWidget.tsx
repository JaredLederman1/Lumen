'use client'

import { CSSProperties } from 'react'
import Link from 'next/link'
import WidgetCard from './WidgetCard'
import { useOpportunityQuery } from '@/lib/queries'
import type { OpportunityData } from '@/app/api/opportunity/route'

// Matched to DebtTrajectoryCard so the two teaser widgets share shell height.

const primaryLabel: CSSProperties = {
  fontFamily: 'var(--font-sans)',
  fontSize: '11px',
  fontWeight: 500,
  color: 'var(--color-text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  margin: 0,
}

const heroValue: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontSize: '56px',
  fontWeight: 400,
  color: 'var(--color-text)',
  letterSpacing: '-0.01em',
  lineHeight: 1,
  margin: 0,
}

const heroContext: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '13px',
  color: 'var(--color-text-mid)',
  lineHeight: 1.55,
  margin: 0,
}

const emptyLabel: CSSProperties = {
  fontFamily: 'var(--font-sans)',
  fontSize: '11px',
  fontWeight: 500,
  color: 'var(--color-text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  margin: 0,
  opacity: 0.7,
}

const emptyTitle: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '14px',
  color: 'var(--color-text-mid)',
  margin: 0,
  lineHeight: 1.4,
}

const emptySub: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '12px',
  color: 'var(--color-text-muted)',
  lineHeight: 1.6,
  margin: 0,
  opacity: 0.8,
}

const copy: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '12px',
  color: 'var(--color-text-mid)',
  lineHeight: 1.55,
  margin: 0,
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

const shellStyle: CSSProperties = {
  minHeight: '260px',
  maxHeight: '340px',
  overflow: 'hidden',
}

const emptyShellStyle: CSSProperties = {
  ...shellStyle,
  opacity: 0.7,
}

const fmtCurrency = (n: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Math.max(0, Math.round(n)))

// ── Component ───────────────────────────────────────────────────────────────

export default function OpportunityCostWidget() {
  const { data: raw, isLoading } = useOpportunityQuery<OpportunityData>()
  const data = raw && typeof raw.idleCash === 'number' ? raw : null

  if (isLoading) {
    return (
      <WidgetCard label="Opportunity cost" style={shellStyle}>
        <p style={copy}>Computing what idle cash is costing you.</p>
        <Link href="/dashboard/opportunity" style={ctaLink}>
          Open calculator &rarr;
        </Link>
      </WidgetCard>
    )
  }

  if (!data || data.idleCash <= 0) {
    return (
      <div style={{ width: '100%', height: '100%' }}>
        <WidgetCard style={emptyShellStyle}>
          <p style={emptyLabel}>Opportunity cost</p>
          <p style={emptyTitle}>Nothing sitting idle.</p>
          <p style={emptySub}>
            Your liquid cash is close to your 3-month buffer, so there is nothing obvious to redeploy right now.
          </p>
          <Link href="/dashboard/opportunity" style={ctaLink}>
            Open calculator &rarr;
          </Link>
        </WidgetCard>
      </div>
    )
  }

  // Populated: large serif hero, single sentence of context, CTA.
  return (
    <WidgetCard label="Opportunity cost" style={shellStyle}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-label-to-value)' }}>
        <p style={primaryLabel}>10-year foregone growth</p>
        <p style={heroValue}>{fmtCurrency(data.tenYearCost)}</p>
      </div>

      <p style={{ ...copy, ...heroContext }}>
        {fmtCurrency(data.idleCash)} parked above your 3-month buffer compounds to the hero figure at a 7% historical return over ten years.
      </p>

      <Link href="/dashboard/opportunity" style={ctaLink}>
        Open calculator &rarr;
      </Link>
    </WidgetCard>
  )
}
