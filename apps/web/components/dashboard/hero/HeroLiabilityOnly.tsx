'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { CSSProperties } from 'react'

const banner: CSSProperties = {
  backgroundColor: 'var(--color-surface)',
  border: '1px solid var(--color-gold-border)',
  borderRadius: 'var(--radius-md)',
  padding: '10px 18px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '16px',
  width: '100%',
}

const message: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '12px',
  color: 'var(--color-text-mid)',
  letterSpacing: '0.04em',
  margin: 0,
}

const cta: CSSProperties = {
  padding: '7px 16px',
  backgroundColor: 'var(--color-gold)',
  border: 'none',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--color-text)',
  fontFamily: 'var(--font-sans)',
  fontSize: '11px',
  fontWeight: 500,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  textDecoration: 'none',
  whiteSpace: 'nowrap',
}

export default function HeroLiabilityOnly() {
  return (
    <motion.section
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      style={banner}
    >
      <p style={message}>Link a bank or investment account.</p>
      <Link href="/dashboard/accounts" style={cta}>
        Link account
      </Link>
    </motion.section>
  )
}
