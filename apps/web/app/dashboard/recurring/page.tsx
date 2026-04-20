'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { RecurringMerchant } from '@/app/api/recurring/route'
import { useRecurringQuery, useExcludeRecurringMutation } from '@/lib/queries'
import { useIsMobile } from '@/hooks/useIsMobile'
import MobileCard from '@/components/ui/MobileCard'
import MobileMetricCard from '@/components/ui/MobileMetricCard'
import { colors, fonts, spacing, radius } from '@/lib/theme'

type FrequencyFilter = 'all' | 'monthly' | 'irregular'

const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

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

// Shared data hook logic extracted to avoid duplication between desktop and mobile
function useRecurringData() {
  const { data, isLoading } = useRecurringQuery<RecurringMerchant>()
  const exclude = useExcludeRecurringMutation()
  const [filter, setFilter] = useState<FrequencyFilter>('all')
  const [expanded, setExpanded] = useState<string | null>(null)

  const recurring = data?.recurring ?? []
  const totalMonthlyEstimate = data?.totalMonthlyEstimate ?? 0
  const totalCount = data?.totalCount ?? 0

  function markNonRecurring(merchantName: string) {
    exclude.mutate(merchantName, {
      onError: err => console.error('[recurring] exclude failed:', err),
    })
  }

  const filtered = filter === 'all' ? recurring : recurring.filter(r => r.frequency === filter)
  const excluding = exclude.isPending ? (exclude.variables ?? null) : null

  return {
    loading: isLoading,
    recurring,
    totalMonthlyEstimate,
    totalCount,
    filter,
    setFilter,
    excluding,
    expanded,
    setExpanded,
    filtered,
    markNonRecurring,
  }
}

function RecurringDesktop() {
  const {
    loading,
    totalMonthlyEstimate,
    totalCount,
    filter,
    setFilter,
    excluding,
    expanded,
    setExpanded,
    filtered,
    markNonRecurring,
  } = useRecurringData()

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '320px' }}>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', color: 'var(--color-text-muted)', letterSpacing: '0.06em' }}>
          Loading...
        </p>
      </div>
    )
  }

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
                letterSpacing: '0.06em',
                padding: '6px 14px',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                border: active ? '1px solid var(--color-gold)' : '1px solid var(--color-border)',
                backgroundColor: active ? 'var(--color-gold)' : 'transparent',
                color: active ? 'var(--color-bg)' : 'var(--color-text-muted)',
                transition: 'border-color 150ms ease, background-color 150ms ease, color 150ms ease',
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
            {filtered.map((merchant, i) => {
              const isOpen = expanded === merchant.name
              return (
                <div key={merchant.name}>
                  <div
                    onClick={() => setExpanded(isOpen ? null : merchant.name)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '14px 0',
                      borderTop: i === 0 ? 'none' : '1px solid var(--color-border)',
                      cursor: 'pointer',
                      transition: 'background-color 120ms ease-out',
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '10px',
                          color: 'var(--color-text-muted)',
                          transition: 'transform 150ms ease-out',
                          transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                          display: 'inline-block',
                        }}>
                          ▸
                        </span>
                        <span style={{
                          fontFamily: 'var(--font-serif)',
                          fontSize: '18px',
                          fontWeight: 400,
                          color: 'var(--color-text)',
                        }}>
                          {merchant.name}
                        </span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'row', gap: '6px', alignItems: 'center', paddingLeft: '18px' }}>
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

                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
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
                          {merchant.occurrences} charge{merchant.occurrences !== 1 ? 's' : ''}
                        </span>
                        {merchant.nextExpectedDate && (
                          <span style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '11px',
                            color: 'var(--color-gold)',
                          }}>
                            Next: {fmtDate(merchant.nextExpectedDate)}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={e => { e.stopPropagation(); markNonRecurring(merchant.name) }}
                        disabled={excluding === merchant.name}
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '11px',
                          letterSpacing: '0.08em',
                          textTransform: 'uppercase',
                          padding: '5px 10px',
                          borderRadius: '2px',
                          cursor: excluding === merchant.name ? 'not-allowed' : 'pointer',
                          border: '1px solid var(--color-border)',
                          backgroundColor: 'transparent',
                          color: 'var(--color-text-muted)',
                          opacity: excluding === merchant.name ? 0.5 : 1,
                          transition: 'border-color 120ms ease-out, color 120ms ease-out',
                          whiteSpace: 'nowrap',
                        }}
                        onMouseEnter={e => {
                          if (excluding !== merchant.name) {
                            e.currentTarget.style.borderColor = 'var(--color-negative)'
                            e.currentTarget.style.color = 'var(--color-negative)'
                          }
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.borderColor = 'var(--color-border)'
                          e.currentTarget.style.color = 'var(--color-text-muted)'
                        }}
                      >
                        {excluding === merchant.name ? 'Removing...' : 'Not Recurring'}
                      </button>
                    </div>
                  </div>

                  {/* Expandable charge history */}
                  <AnimatePresence>
                    {isOpen && merchant.charges && merchant.charges.length > 0 && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: 'easeInOut' }}
                        style={{ overflow: 'hidden' }}
                      >
                        <div style={{
                          marginLeft: '18px',
                          marginBottom: '14px',
                          padding: '12px 16px',
                          backgroundColor: 'var(--color-surface-2)',
                          border: '1px solid var(--color-border)',
                          borderRadius: '2px',
                        }}>
                          <p style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '10px',
                            color: 'var(--color-text-muted)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.12em',
                            marginBottom: '10px',
                          }}>
                            Past Charges
                          </p>
                          {merchant.charges.map((charge, ci) => (
                            <div
                              key={ci}
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '7px 0',
                                borderTop: ci === 0 ? 'none' : '1px solid var(--color-border)',
                              }}
                            >
                              <span style={{
                                fontFamily: 'var(--font-mono)',
                                fontSize: '13px',
                                color: 'var(--color-text-mid)',
                              }}>
                                {fmtDate(charge.date)}
                              </span>
                              <span style={{
                                fontFamily: 'var(--font-serif)',
                                fontSize: '15px',
                                color: charge.amount < 0 ? 'var(--color-negative)' : 'var(--color-text)',
                              }}>
                                {fmt.format(Math.abs(charge.amount))}
                              </span>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )
            })}
          </div>
        )}
      </motion.div>

    </div>
  )
}

function RecurringMobile() {
  const {
    loading,
    totalMonthlyEstimate,
    totalCount,
    filter,
    setFilter,
    excluding,
    expanded,
    setExpanded,
    filtered,
    markNonRecurring,
  } = useRecurringData()

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '320px' }}>
        <p style={{ fontFamily: fonts.mono, fontSize: 14, color: colors.textMuted, letterSpacing: '0.06em' }}>
          Loading...
        </p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sectionGap }}>

      {/* Metric cards stacked */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut', delay: 0 }}
        style={{ display: 'flex', flexDirection: 'column', gap: spacing.sectionGap }}
      >
        <MobileMetricCard
          label="Estimated Monthly Recurring"
          value={fmt.format(Math.abs(totalMonthlyEstimate))}
          valueColor={colors.negative}
        />
        <MobileMetricCard
          label="Recurring Merchants Detected"
          value={String(totalCount)}
        />
      </motion.div>

      {/* Filter chips: horizontal scroll row */}
      {/* RN: use FlatList horizontal */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut', delay: 0.08 }}
        style={{ display: 'flex', flexDirection: 'row', gap: spacing.tightGap, overflowX: 'auto' }}
      >
        {FILTERS.map(f => {
          const active = filter === f.value
          return (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              style={{
                minHeight: spacing.tapTarget,
                borderRadius: radius.badge,
                fontFamily: fonts.mono,
                fontSize: 12,
                letterSpacing: '0.10em',
                padding: '0 14px',
                cursor: 'pointer',
                border: active ? `1px solid ${colors.gold}` : `1px solid ${colors.border}`,
                backgroundColor: active ? colors.gold : 'transparent',
                color: active ? colors.surface : colors.textMuted,
                whiteSpace: 'nowrap',
                flexShrink: 0,
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
      >
        <MobileCard>
          <p style={{
            fontFamily: fonts.mono,
            fontSize: 10,
            color: colors.textMuted,
            textTransform: 'uppercase',
            letterSpacing: '0.16em',
            marginBottom: 16,
          }}>
            Detected Recurring Charges
          </p>

          {filtered.length === 0 ? (
            <p style={{
              fontFamily: fonts.mono,
              fontSize: 14,
              color: colors.textMuted,
              textAlign: 'center',
              padding: '32px 0',
              lineHeight: 1.7,
            }}>
              No recurring charges detected. Connect accounts and sync transactions to populate this view.
            </p>
          ) : (
            <div>
              {filtered.map((merchant, i) => {
                const isOpen = expanded === merchant.name
                return (
                  <div
                    key={merchant.name}
                    style={{
                      borderTop: i === 0 ? 'none' : `1px solid ${colors.border}`,
                      paddingTop: i === 0 ? 0 : spacing.rowGap,
                      paddingBottom: spacing.rowGap,
                    }}
                  >
                    {/* Row tap area */}
                    <div
                      onClick={() => setExpanded(isOpen ? null : merchant.name)}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: spacing.tightGap,
                        cursor: 'pointer',
                        minHeight: spacing.tapTarget,
                        justifyContent: 'center',
                      }}
                    >
                      {/* Top row: name and amount/charges */}
                      <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <span style={{
                          fontFamily: fonts.serif,
                          fontSize: 18,
                          fontWeight: 400,
                          color: colors.text,
                          flex: 1,
                          marginRight: spacing.tightGap,
                        }}>
                          {merchant.name}
                        </span>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                          <span style={{
                            fontFamily: fonts.serif,
                            fontSize: 18,
                            fontWeight: 400,
                            color: merchant.lastAmount < 0 ? colors.negative : colors.text,
                          }}>
                            {fmt.format(Math.abs(merchant.lastAmount))}
                          </span>
                          <span style={{
                            fontFamily: fonts.mono,
                            fontSize: 12,
                            color: colors.textMuted,
                          }}>
                            {merchant.occurrences} charge{merchant.occurrences !== 1 ? 's' : ''}
                          </span>
                          {merchant.nextExpectedDate && (
                            <span style={{
                              fontFamily: fonts.mono,
                              fontSize: 11,
                              color: colors.gold,
                            }}>
                              Next: {fmtDate(merchant.nextExpectedDate)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Category and frequency badges */}
                      <div style={{ display: 'flex', flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                        {merchant.category && (
                          <span style={{
                            fontFamily: fonts.mono,
                            fontSize: 12,
                            textTransform: 'uppercase',
                            letterSpacing: '0.08em',
                            color: colors.gold,
                            backgroundColor: colors.goldSubtle,
                            padding: '2px 6px',
                            borderRadius: radius.badge,
                          }}>
                            {merchant.category}
                          </span>
                        )}
                        <span style={{
                          fontFamily: fonts.mono,
                          fontSize: 12,
                          textTransform: 'uppercase',
                          letterSpacing: '0.08em',
                          color: colors.info,
                          backgroundColor: colors.infoBg,
                          padding: '2px 6px',
                          borderRadius: radius.badge,
                        }}>
                          {merchant.frequency}
                        </span>
                      </div>
                    </div>

                    {/* Not Recurring button */}
                    <button
                      onClick={e => { e.stopPropagation(); markNonRecurring(merchant.name) }}
                      disabled={excluding === merchant.name}
                      style={{
                        marginTop: spacing.tightGap,
                        minHeight: spacing.tapTarget,
                        width: '100%',
                        fontFamily: fonts.mono,
                        fontSize: 12,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        borderRadius: radius.button,
                        cursor: excluding === merchant.name ? 'not-allowed' : 'pointer',
                        border: `1px solid ${colors.border}`,
                        backgroundColor: 'transparent',
                        color: colors.textMuted,
                        opacity: excluding === merchant.name ? 0.5 : 1,
                      }}
                    >
                      {excluding === merchant.name ? 'Removing...' : 'Not Recurring'}
                    </button>

                    {/* Expandable charge history */}
                    <AnimatePresence>
                      {isOpen && merchant.charges && merchant.charges.length > 0 && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2, ease: 'easeInOut' }}
                          style={{ overflow: 'hidden' }}
                        >
                          <div style={{
                            marginTop: spacing.tightGap,
                            padding: '12px',
                            backgroundColor: 'var(--color-surface-2)',
                            border: `1px solid ${colors.border}`,
                            borderRadius: radius.card,
                          }}>
                            <p style={{
                              fontFamily: fonts.mono,
                              fontSize: 10,
                              color: colors.textMuted,
                              textTransform: 'uppercase',
                              letterSpacing: '0.12em',
                              marginBottom: 10,
                            }}>
                              Past Charges
                            </p>
                            {merchant.charges.map((charge, ci) => (
                              <div
                                key={ci}
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  padding: '7px 0',
                                  borderTop: ci === 0 ? 'none' : `1px solid ${colors.border}`,
                                }}
                              >
                                <span style={{ fontFamily: fonts.mono, fontSize: 13, color: colors.textMid }}>
                                  {fmtDate(charge.date)}
                                </span>
                                <span style={{
                                  fontFamily: fonts.serif,
                                  fontSize: 15,
                                  color: charge.amount < 0 ? colors.negative : colors.text,
                                }}>
                                  {fmt.format(Math.abs(charge.amount))}
                                </span>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )
              })}
            </div>
          )}
        </MobileCard>
      </motion.div>

    </div>
  )
}

export default function RecurringPage() {
  const isMobile = useIsMobile()
  return isMobile ? <RecurringMobile /> : <RecurringDesktop />
}
