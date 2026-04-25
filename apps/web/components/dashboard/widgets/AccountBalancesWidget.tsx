'use client'

import { CSSProperties } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useAccountsQuery } from '@/lib/queries'
import WidgetCard from './WidgetCard'
import WidgetSkeleton, { WIDGET_REVEAL } from './WidgetSkeleton'

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Math.round(n))

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

export default function AccountBalancesWidget() {
  const { data, isPending } = useAccountsQuery()
  if (isPending) return <WidgetSkeleton variant="list" />
  const accounts = data ?? []
  const ordered = [...accounts].sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance))

  return (
    <motion.div {...WIDGET_REVEAL}>
    <WidgetCard
      variant="list"
      eyebrow="Accounts"
      cta={
        <Link href="/dashboard/accounts" style={ctaLink}>
          Manage &rarr;
        </Link>
      }
    >
      {ordered.length === 0 ? (
        <p style={emptyCopy}>No accounts linked.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {ordered.slice(0, 5).map(a => {
            const isLiability = (a as { classification?: string }).classification === 'liability'
            return (
              <div
                key={a.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '12px',
                  color: 'var(--color-text-mid)',
                }}
              >
                <span>
                  {a.institutionName}
                  {a.last4 ? ` ····${a.last4}` : ''}
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    color: isLiability
                      ? 'var(--color-negative)'
                      : 'var(--color-text)',
                  }}
                >
                  {fmt(a.balance)}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </WidgetCard>
    </motion.div>
  )
}
