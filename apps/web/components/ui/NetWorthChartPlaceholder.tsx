'use client'

import Link from 'next/link'

const card: React.CSSProperties = {
  backgroundColor: 'var(--color-surface)',
  border: '1px solid var(--color-gold-border)',
  borderRadius: '2px',
  padding: '28px',
  display: 'flex',
  flexDirection: 'column',
  gap: '14px',
}

const eyebrow: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '12px',
  color: 'var(--color-text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.16em',
  margin: 0,
}

const headline: React.CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontSize: '24px',
  fontWeight: 400,
  color: 'var(--color-text)',
  margin: 0,
  lineHeight: 1.2,
}

const body: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '13px',
  color: 'var(--color-text-mid)',
  lineHeight: 1.7,
  margin: 0,
  maxWidth: '520px',
}

const cta: React.CSSProperties = {
  alignSelf: 'flex-start',
  marginTop: '6px',
  padding: '10px 24px',
  backgroundColor: 'var(--color-gold)',
  border: 'none',
  borderRadius: '2px',
  color: 'var(--color-text)',
  fontFamily: 'var(--font-mono)',
  fontSize: '13px',
  letterSpacing: '0.08em',
  textDecoration: 'none',
  display: 'inline-block',
}

export default function NetWorthChartPlaceholder() {
  return (
    <div style={card}>
      <p style={eyebrow}>Net Worth Over Time</p>
      <p style={headline}>Link a bank or investment account</p>
      <p style={body}>
        Illumin needs at least one checking, savings, or investment account to calculate your full net worth. Credit cards alone only tell half the story.
      </p>
      <Link href="/dashboard/accounts" style={cta}>
        Link account
      </Link>
    </div>
  )
}
