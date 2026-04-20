'use client'

import { CSSProperties } from 'react'

interface Props {
  value: string
  label?: string
  tone?: 'neutral' | 'alert' | 'positive'
  size?: 'md' | 'lg'
}

const wrap: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-label-to-value)',
}

const labelStyle: CSSProperties = {
  fontFamily: 'var(--font-sans)',
  fontSize: '11px',
  fontWeight: 500,
  color: 'var(--color-text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  margin: 0,
}

const sizes: Record<NonNullable<Props['size']>, CSSProperties> = {
  md: { fontSize: '24px' },
  lg: { fontSize: '32px' },
}

const toneColor: Record<NonNullable<Props['tone']>, string> = {
  neutral: 'var(--color-text)',
  alert: 'var(--color-negative)',
  positive: 'var(--color-positive)',
}

export default function MetricDisplay({
  value,
  label,
  tone = 'neutral',
  size = 'lg',
}: Props) {
  return (
    <div style={wrap}>
      {label && <p style={labelStyle}>{label}</p>}
      <p
        style={{
          fontFamily: 'var(--font-mono)',
          lineHeight: 1.1,
          margin: 0,
          color: toneColor[tone],
          letterSpacing: '-0.01em',
          ...sizes[size],
        }}
      >
        {value}
      </p>
    </div>
  )
}
