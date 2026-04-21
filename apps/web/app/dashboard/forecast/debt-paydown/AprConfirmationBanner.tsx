'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { CSSProperties, useEffect, useState } from 'react'

interface Props {
  // True when every debt account still shows the fallback 24% APR rather
  // than a user-entered rate. The banner renders only in that case.
  allDefaultApr: boolean
}

const DISMISS_KEY = 'illumin.debtPaydown.aprConfirmationDismissed'

const banner: CSSProperties = {
  backgroundColor: 'var(--color-gold-subtle)',
  border: '1px solid var(--color-gold-border)',
  borderLeft: '3px solid var(--color-gold)',
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
  color: 'var(--color-gold)',
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
  color: 'var(--color-gold)',
  fontWeight: 600,
}

const dismissBtn: CSSProperties = {
  padding: '5px 12px',
  backgroundColor: 'transparent',
  border: '1px solid var(--color-gold-border)',
  borderRadius: 'var(--radius-md)',
  color: 'var(--color-text)',
  fontFamily: 'var(--font-mono)',
  fontSize: '10px',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
}

/**
 * Top-of-page flag that prompts the user to confirm APRs for their debts.
 * Only appears when every debt is still at the 24% default fallback (i.e.,
 * the user has not manually set any APR). Dismissal is persisted in
 * localStorage so the banner doesn't nag on every visit. If the user comes
 * back with all APRs still at default but has dismissed before, the flag
 * stays hidden by design — the reminder is a one-time nudge per device.
 */
export function AprConfirmationBanner({ allDefaultApr }: Props) {
  const [dismissed, setDismissed] = useState<boolean | null>(null)

  useEffect(() => {
    let initial: boolean
    try {
      initial = window.localStorage.getItem(DISMISS_KEY) === '1'
    } catch {
      initial = false
    }
    // Defer the commit via rAF to satisfy the no-setState-in-effect lint
    // rule without introducing a hydration mismatch (server renders with
    // dismissed=null, so nothing shows until we know the real value).
    const id = requestAnimationFrame(() => setDismissed(initial))
    return () => cancelAnimationFrame(id)
  }, [])

  const handleDismiss = () => {
    setDismissed(true)
    try { window.localStorage.setItem(DISMISS_KEY, '1') } catch {}
  }

  if (!allDefaultApr) return null
  if (dismissed === null || dismissed) return null

  return (
    <AnimatePresence>
      <motion.section
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        style={banner}
        role="status"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
          <span style={icon} aria-hidden="true">?</span>
          <p style={message}>
            Every APR below is the <span style={messageStrong}>24% default</span>.
            Click an APR to enter the rate from your statement so the paydown
            math reflects your actual debts.
          </p>
        </div>
        <button onClick={handleDismiss} style={dismissBtn}>
          Dismiss
        </button>
      </motion.section>
    </AnimatePresence>
  )
}
