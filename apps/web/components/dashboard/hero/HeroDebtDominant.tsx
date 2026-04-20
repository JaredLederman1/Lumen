'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { CSSProperties, useEffect, useState } from 'react'

interface Props {
  annualInterestCost: number
}

const DISMISS_KEY = 'illumin.debtCostWarning.dismissed'

function fmt(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Math.max(0, Math.round(n)))
}

const banner: CSSProperties = {
  backgroundColor: 'var(--color-negative-bg)',
  border: '1px solid var(--color-negative-border)',
  borderLeft: '3px solid var(--color-negative)',
  borderRadius: 'var(--radius-md)',
  padding: '10px 16px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '16px',
  width: '100%',
}

const icon: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '13px',
  color: 'var(--color-negative)',
  fontWeight: 700,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
}

const message: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '12px',
  color: 'var(--color-text)',
  letterSpacing: '0.03em',
  margin: 0,
  lineHeight: 1.4,
}

const messageStrong: CSSProperties = {
  color: 'var(--color-negative)',
  fontWeight: 600,
}

const dismissBtn: CSSProperties = {
  padding: '5px 12px',
  backgroundColor: 'transparent',
  border: '1px solid var(--color-negative-border)',
  borderRadius: 'var(--radius-md)',
  color: 'var(--color-text)',
  fontFamily: 'var(--font-mono)',
  fontSize: '10px',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
}

export default function HeroDebtDominant({ annualInterestCost }: Props) {
  const [dismissed, setDismissed] = useState<boolean | null>(null)

  useEffect(() => {
    try {
      setDismissed(window.localStorage.getItem(DISMISS_KEY) === '1')
    } catch {
      setDismissed(false)
    }
  }, [])

  const handleDismiss = () => {
    setDismissed(true)
    try { window.localStorage.setItem(DISMISS_KEY, '1') } catch {}
  }

  if (dismissed === null || dismissed) return null

  return (
    <AnimatePresence>
      <motion.section
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        style={banner}
        role="alert"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
          <span style={icon} aria-hidden="true">!</span>
          <p style={message}>
            Your debt is costing you{' '}
            <span style={messageStrong}>{fmt(annualInterestCost)}/yr</span>{' '}
            in interest. Pay this down before anything else.
          </p>
        </div>
        <button onClick={handleDismiss} style={dismissBtn}>
          I understand, dismiss
        </button>
      </motion.section>
    </AnimatePresence>
  )
}
