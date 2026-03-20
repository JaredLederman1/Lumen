'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import type { RecurringMerchant } from '@/app/api/recurring/route'

type FrequencyFilter = 'all' | 'monthly' | 'irregular'

const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

const card: React.CSSProperties = {
  backgroundColor: 'var(--color-surface)',
  border: '1px solid var(--color-gold-border)',
  borderRadius: '2px',
  padding: '28px',
}

const sectionLabel: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '12px',
  color: 'var(--color-text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.16em',
  marginBottom: '22px',
}

const FILTERS: { label: string; value: FrequencyFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Monthly', value: 'monthly' },
  { label: 'Irregular', value: 'irregular' },
]

export default function RecurringPage() {
  const [loading, setLoading] = useState(true)
  const [recurring, setRecurring] = useState<RecurringMerchant[]>([])
  const [totalMonthlyEstimate, setTotalMonthlyEstimate] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [filter, setFilter] = useState<FrequencyFilter>('all')

  useEffect(() => {
    fetch('/api/recurring')
      .then(r => r.json())
      .then(data => {
        setRecurring(data.recurring ?? [])
        setTotalMonthlyEstimate(data.totalMonthlyEstimate ?? 0)
        setTotalCount(data.totalCount ?? 0)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '320px' }}>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', color: 'var(--color-text-muted)', letterSpacing: '0.06em' }}>
          Loading...
        </p>
      </div>
    )
  }

  const filtered = filter === 'all' ? recurring : recurring.filter(r => r.frequency === filter)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Summary bar */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut', delay: 0 }}
        style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}
      >
        <div style={card}>
          <p style={sectionLabel}>Estimated Monthly Recurring</p>
          <p style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '34px',
            fontWeight: 400,
            color: 'var(--color-negative)',
            lineHeight: 1,
          }}>
            {fmt.format(Math.abs(totalMonthlyEstimate))}
          </p>
        </div>
        <div style={card}>
          <p style={sectionLabel}>Recurring Merchants Detected</p>
          <p style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '34px',
            fontWeight: 400,
            color: 'var(--color-text)',
            lineHeight: 1,
          }}>
            {totalCount}
          </p>
        </div>
      </motion.div>

      {/* Filter row */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut', delay: 0.08 }}
        style={{ display: 'flex', flexDirection: 'row', gap: '8px', flexWrap: 'wrap' }}
      >
        {FILTERS.map(f => {
          const active = filter === f.value
          return (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '13px',
                letterSpacing: '0.10em',
                padding: '6px 14px',
                borderRadius: '2px',
                cursor: 'pointer',
                border: active ? '1px solid var(--color-gold)' : '1px solid var(--color-border)',
                backgroundColor: active ? 'var(--color-gold)' : 'transparent',
                color: active ? '#0F1318' : 'var(--color-text-muted)',
                transition: 'border-color 120ms ease-out, background-color 120ms ease-out, color 120ms ease-out',
              }}
              onMouseEnter={e => {
                if (!active) (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-border-strong)'
              }}
              onMouseLeave={e => {
                if (!active) (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-border)'
              }}
            >
              {f.label}
            </button>
          )
        })}
      </motion.div>

      {/* Merchant list */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut', delay: 0.16 }}
        style={card}
      >
        <p style={sectionLabel}>Detected Recurring Charges</p>

        {filtered.length === 0 ? (
          <p style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '14px',
            color: 'var(--color-text-muted)',
            textAlign: 'center',
            padding: '32px 0',
            lineHeight: 1.7,
          }}>
            No recurring charges detected. Connect accounts and sync transactions to populate this view.
          </p>
        ) : (
          <div>
            {filtered.map((merchant, i) => (
              <div
                key={merchant.name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 0',
                  borderTop: i === 0 ? 'none' : '1px solid var(--color-border)',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: '18px',
                    fontWeight: 400,
                    color: 'var(--color-text)',
                  }}>
                    {merchant.name}
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'row', gap: '6px', alignItems: 'center' }}>
                    {merchant.category && (
                      <span style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '12px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        color: 'var(--color-gold)',
                        backgroundColor: 'var(--color-gold-subtle)',
                        padding: '2px 6px',
                        borderRadius: '2px',
                      }}>
                        {merchant.category}
                      </span>
                    )}
                    <span style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '12px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      color: 'var(--color-info)',
                      backgroundColor: 'var(--color-info-bg)',
                      padding: '2px 6px',
                      borderRadius: '2px',
                    }}>
                      {merchant.frequency}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                  <span style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: '19px',
                    fontWeight: 400,
                    color: merchant.lastAmount < 0 ? 'var(--color-negative)' : 'var(--color-text)',
                  }}>
                    {fmt.format(Math.abs(merchant.lastAmount))}
                  </span>
                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '13px',
                    color: 'var(--color-text-muted)',
                  }}>
                    {merchant.occurrences} transaction{merchant.occurrences !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>

    </div>
  )
}
