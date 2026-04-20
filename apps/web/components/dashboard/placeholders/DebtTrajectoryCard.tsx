'use client'

import { CSSProperties } from 'react'
import Link from 'next/link'
import type { DebtPayoffScenarios } from '@/lib/dashboardState'
import type { PayoffResult } from '@/lib/debtPayoff'
import { DEBT_PAYOFF_MAX_MONTHS } from '@/lib/debtPayoff'
import WidgetCard from '../widgets/WidgetCard'

interface Props {
  annualInterestCost: number | null
  highAprDebtTotal: number | null
  scenarios: DebtPayoffScenarios | null
}

const fmtCurrency = (n: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Math.max(0, Math.round(n)))

function payoffDateLabel(result: PayoffResult): string {
  if (result.totalMonths === 0) return 'Paid off'
  if (result.capped) return 'Never at this pace'
  // `payoffDate` comes back from /api/dashboard/state as a JSON-serialized ISO
  // string, not a Date. Accept either form so the widget works whether the
  // scenarios are fed in directly (server render) or round-tripped (client).
  const raw: Date | string = result.payoffDate as unknown as Date | string
  const d = raw instanceof Date ? raw : new Date(raw)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

function monthsLabel(months: number, capped: boolean): string {
  if (capped) return `${DEBT_PAYOFF_MAX_MONTHS}+ mo`
  if (months === 0) return '0 mo'
  const years = Math.floor(months / 12)
  const rem = months % 12
  if (years === 0) return `${rem} mo`
  if (rem === 0) return `${years} yr`
  return `${years} yr ${rem} mo`
}

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
  color: 'var(--color-text)',
  letterSpacing: '-0.01em',
  lineHeight: 1.05,
  margin: 0,
}

const statsRow: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '14px',
  borderTop: '1px solid var(--color-border)',
  marginTop: 'calc(var(--space-section-above) - var(--space-card-label-to-body))',
  paddingTop: 'var(--space-section-below)',
}

const statLabel: CSSProperties = {
  fontFamily: 'var(--font-sans)',
  fontSize: '11px',
  fontWeight: 500,
  color: 'var(--color-text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  marginBottom: 'var(--space-label-to-value)',
}

const statValue: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '18px',
  color: 'var(--color-text)',
  letterSpacing: '-0.01em',
  lineHeight: 1.2,
  margin: 0,
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

// ── Component ───────────────────────────────────────────────────────────────

export default function DebtTrajectoryCard({ scenarios }: Props) {
  if (!scenarios || scenarios.debts.length === 0) {
    return (
      <WidgetCard
        label="Debt trajectory"
        title="No debts tracked"
        subtitle="Link a credit card or loan account to project your payoff date."
        style={shellStyle}
      >
        <Link href="/dashboard/accounts" style={ctaLink}>
          Link a debt account &rarr;
        </Link>
      </WidgetCard>
    )
  }

  // Prefer the avalanche scenario as the "current best" view, fall back to
  // minimum if avalanche matches minimum (flat $0 extra). The minimum scenario
  // is also used to compute headline savings.
  const best = scenarios.avalanche
  const minimum = scenarios.minimum
  const interestSavings = Math.max(0, minimum.totalInterestPaid - best.totalInterestPaid)

  const payoffDate = payoffDateLabel(best)
  const totalInterestRemaining = best.totalInterestPaid
  const months = best.totalMonths

  const savingsLine =
    interestSavings > 0
      ? `Avalanche strategy saves ${fmtCurrency(interestSavings)} in interest vs minimum payments.`
      : 'Paying the minimums is also the avalanche path at this extra rate.'

  return (
    <WidgetCard label="Debt trajectory" style={shellStyle}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-label-to-value)' }}>
        <p style={primaryLabel}>Projected payoff</p>
        <p style={primaryValue}>{payoffDate}</p>
      </div>

      <div style={statsRow}>
        <div>
          <p style={statLabel}>Interest remaining</p>
          <p style={statValue}>{fmtCurrency(totalInterestRemaining)}</p>
        </div>
        <div>
          <p style={statLabel}>Months to debt-free</p>
          <p style={statValue}>{monthsLabel(months, best.capped)}</p>
        </div>
      </div>

      <p style={copy}>{savingsLine}</p>

      <Link href="/dashboard/forecast/debt-paydown" style={ctaLink}>
        Open paydown planner &rarr;
      </Link>
    </WidgetCard>
  )
}
