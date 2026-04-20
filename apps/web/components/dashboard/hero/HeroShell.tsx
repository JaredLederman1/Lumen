'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { CSSProperties, ReactNode } from 'react'

interface HeroShellProps {
  eyebrow?: string
  headline: string
  subtitle: string
  bigNumber?: string
  bigNumberLabel?: string
  ctaLabel: string
  ctaHref: string
  tone?: 'neutral' | 'alert' | 'positive'
  extra?: ReactNode
}

const shellBase: CSSProperties = {
  backgroundColor: 'var(--color-surface)',
  border: '1px solid var(--color-gold-border)',
  borderRadius: 'var(--radius-lg)',
  padding: '32px',
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-card-label-to-body)',
  position: 'relative',
}

const eyebrowStyle: CSSProperties = {
  fontFamily: 'var(--font-sans)',
  fontSize: '11px',
  fontWeight: 500,
  color: 'var(--color-text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  margin: 0,
}

const headlineStyle: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontSize: '32px',
  fontWeight: 400,
  color: 'var(--color-text)',
  margin: 0,
  lineHeight: 1.15,
  maxWidth: '720px',
}

const subtitleStyle: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '13px',
  color: 'var(--color-text-mid)',
  lineHeight: 1.7,
  margin: 0,
  maxWidth: '620px',
}

const bigNumberStyle: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '40px',
  color: 'var(--color-text)',
  letterSpacing: '-0.01em',
  lineHeight: 1.1,
  margin: 0,
}

const bigNumberLabelStyle: CSSProperties = {
  fontFamily: 'var(--font-sans)',
  fontSize: '11px',
  fontWeight: 500,
  color: 'var(--color-text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  margin: 0,
  marginBottom: 'var(--space-label-to-value)',
}

const ctaStyle: CSSProperties = {
  alignSelf: 'flex-start',
  marginTop: '8px',
  padding: '11px 26px',
  backgroundColor: 'var(--color-gold)',
  border: 'none',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--color-text)',
  fontFamily: 'var(--font-sans)',
  fontSize: '13px',
  fontWeight: 500,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  textDecoration: 'none',
  display: 'inline-block',
}

const toneAccent: Record<NonNullable<HeroShellProps['tone']>, CSSProperties> = {
  neutral: {},
  alert: {
    borderColor: 'var(--color-negative-border)',
  },
  positive: {
    borderColor: 'var(--color-positive-border)',
  },
}

export default function HeroShell({
  eyebrow,
  headline,
  subtitle,
  bigNumber,
  bigNumberLabel,
  ctaLabel,
  ctaHref,
  tone = 'neutral',
  extra,
}: HeroShellProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="card-hoverable"
      style={{ ...shellBase, ...toneAccent[tone] }}
    >
      {eyebrow && <p style={eyebrowStyle}>{eyebrow}</p>}
      <h1 style={headlineStyle}>{headline}</h1>
      {bigNumber && (
        <div>
          {bigNumberLabel && <p style={bigNumberLabelStyle}>{bigNumberLabel}</p>}
          <p style={bigNumberStyle}>{bigNumber}</p>
        </div>
      )}
      <p style={subtitleStyle}>{subtitle}</p>
      {extra}
      <Link href={ctaHref} style={ctaStyle}>
        {ctaLabel}
      </Link>
    </motion.section>
  )
}
