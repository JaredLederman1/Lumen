'use client'

import { CSSProperties } from 'react'
import Link from 'next/link'
import WidgetCard from '../widgets/WidgetCard'
import type { MatchDetail } from '@/lib/dashboardState'

interface Props {
  matchGapAnnual: number | null
  totalMatchAnnual: number | null
  matchCapturedAnnual: number | null
  matchDetail: MatchDetail | null
}

const fmtDollars = (n: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Math.max(0, Math.round(n)))

// ── Styles ──────────────────────────────────────────────────────────────────

const primaryLabel: CSSProperties = {
  fontFamily: 'var(--font-sans)',
  fontSize: '11px',
  fontWeight: 500,
  color: 'var(--color-text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  margin: 0,
}

const primaryValue: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '32px',
  letterSpacing: '-0.01em',
  lineHeight: 1.05,
  margin: 0,
}

const copy: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '12px',
  color: 'var(--color-text-mid)',
  lineHeight: 1.6,
  margin: 0,
}

const strongMono: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  color: 'var(--color-text)',
  letterSpacing: '-0.01em',
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

// ── Component ───────────────────────────────────────────────────────────────

export default function MatchGapCard({ matchGapAnnual, matchDetail }: Props) {
  const hasDetail =
    !!matchDetail && !!matchDetail.matchFormula && matchDetail.salary > 0

  if (!hasDetail) {
    return (
      <WidgetCard
        label="401(k) Match Gap"
        title="Upload your offer letter"
        subtitle="We need your match formula to size the gap. Two fields, one upload."
        style={shellStyle}
      >
        <Link href="/dashboard/benefits" style={ctaLink}>
          Close the gap &rarr;
        </Link>
      </WidgetCard>
    )
  }

  const atCap =
    matchDetail!.currentEmployeeRate >= matchDetail!.matchFormula!.matchCap
  const gap = matchGapAnnual ?? 0
  const compoundedOpportunity = atCap
    ? matchDetail!.compoundedProjection.valueFromEmployerMatch
    : matchDetail!.compoundedProjection.valueLostToGap

  const primaryColor = atCap
    ? 'var(--color-positive)'
    : 'var(--color-negative)'

  const primaryDisplay = atCap
    ? fmtDollars(matchDetail!.compoundedProjection.valueFromEmployerMatch / Math.max(1, matchDetail!.yearsToRetirement))
    : fmtDollars(gap)

  const primaryLine = atCap
    ? 'Annual match captured'
    : 'Annual match left on the table'

  const compoundedLine = atCap
    ? 'Compounded to retirement: '
    : 'Compounded to retirement, that is: '

  return (
    <WidgetCard
      label="401(k) Match Gap"
      accent={atCap ? 'positive' : 'alert'}
      style={shellStyle}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-label-to-value)' }}>
        <p style={primaryLabel}>{primaryLine}</p>
        <p style={{ ...primaryValue, color: primaryColor }}>{primaryDisplay}</p>
      </div>

      <p style={copy}>
        {compoundedLine}
        <span style={{ ...strongMono, color: atCap ? 'var(--color-positive)' : 'var(--color-negative)' }}>
          {fmtDollars(compoundedOpportunity)}
        </span>
        .{' '}
        {atCap
          ? 'Keep your contribution rate at the full match to preserve this.'
          : 'Raise your contribution to the full match cap to close it.'}
      </p>

      <Link href="/dashboard/benefits" style={ctaLink}>
        Close the gap &rarr;
      </Link>
    </WidgetCard>
  )
}
