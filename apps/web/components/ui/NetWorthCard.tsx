'use client'

import { CSSProperties, useState } from 'react'
import { motion } from 'framer-motion'
import DataTooltip from '@/components/ui/DataTooltip'
import type { TooltipSource } from '@/lib/tooltipContext'
import { useCountUp } from '@/lib/useCountUp'

interface AccountForTooltip {
  institutionName: string
  last4: string | null
  balance: number
  classification?: string
}

interface NetWorthCardProps {
  current: number
  lastMonth: number
  totalAssets: number
  totalLiabilities: number
  accounts?: AccountForTooltip[]
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

const label: CSSProperties = {
  fontFamily: 'var(--font-sans)',
  fontSize: '11px',
  fontWeight: 500,
  color: 'var(--color-text-muted)',
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  margin: 0,
}

export default function NetWorthCard({ current, lastMonth, totalAssets, totalLiabilities, accounts }: NetWorthCardProps) {
  const animatedCurrent     = useCountUp(current)
  const animatedAssets      = useCountUp(totalAssets)
  const animatedLiabilities = useCountUp(totalLiabilities)
  const [hovered, setHovered] = useState(false)

  const change = current - lastMonth
  const pctRaw = lastMonth === 0 ? 0 : (change / lastMonth) * 100
  const changePct = pctRaw.toFixed(1)
  const isPositive = change >= 0
  const showDelta = Math.abs(change) >= 1 && parseFloat(changePct) !== 0

  const netWorthSources: TooltipSource[] = accounts && accounts.length > 0
    ? accounts.map(a => ({
        label: a.institutionName + (a.last4 ? ' ....' + a.last4 : ''),
        value: a.balance,
        type: 'account' as const,
      }))
    : [
        { label: 'Total Assets', value: totalAssets, type: 'computed' as const },
        { label: 'Total Liabilities', value: -totalLiabilities, type: 'computed' as const },
      ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        backgroundColor: hovered ? 'var(--color-surface-hover)' : 'var(--color-surface)',
        border: `1px solid ${hovered ? 'var(--color-border-hover)' : 'var(--color-border)'}`,
        borderRadius: 'var(--radius-lg)',
        padding: '36px 40px',
        display: 'flex',
        alignItems: 'center',
        gap: '56px',
        transition: 'border-color 150ms ease, background-color 150ms ease',
      }}
    >
      {/* Primary figure */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ ...label, marginBottom: '12px' }}>
          Net Worth
        </p>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '18px', flexWrap: 'wrap', marginBottom: '10px' }}>
          <DataTooltip
            value={animatedCurrent}
            title="Net Worth"
            computationNote="Total assets minus total liabilities across all connected accounts"
            sources={netWorthSources}
            accentColor="var(--color-gold)"
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '72px',
              fontWeight: 300,
              color: 'var(--color-text)',
              lineHeight: 1,
              letterSpacing: '-0.01em',
            }}
          />
          {showDelta && (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              fontFamily: 'var(--font-mono)',
              fontSize: '14px',
              color: isPositive ? 'var(--color-positive)' : 'var(--color-negative)',
              backgroundColor: isPositive ? 'var(--color-positive-bg)' : 'var(--color-negative-bg)',
              padding: '4px 10px',
              borderRadius: 'var(--radius-pill)',
            }}>
              {isPositive ? '↑' : '↓'}
              {formatCurrency(Math.abs(change))}
              <span style={{ opacity: 0.7 }}>({isPositive ? '+' : ''}{changePct}%)</span>
            </span>
          )}
        </div>
        {showDelta && (
          <p style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '13px',
            color: 'var(--color-text-muted)',
            letterSpacing: '0.04em',
          }}>
            vs last month
          </p>
        )}
      </div>

      {/* Divider */}
      <div style={{ width: '1px', height: '80px', backgroundColor: 'var(--color-border)', flexShrink: 0 }} />

      {/* Assets + Liabilities */}
      <div style={{ display: 'flex', gap: '48px', alignItems: 'center' }}>
        <div>
          <p style={{ ...label, marginBottom: '10px' }}>
            Total Assets
          </p>
          <p style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '28px',
            fontWeight: 400,
            color: 'var(--color-text)',
            lineHeight: 1,
          }}>
            {formatCurrency(animatedAssets)}
          </p>
        </div>

        <div style={{ width: '1px', height: '52px', backgroundColor: 'var(--color-border)' }} />

        <div>
          <p style={{ ...label, marginBottom: '10px' }}>
            Total Liabilities
          </p>
          <p style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '28px',
            fontWeight: 400,
            color: 'var(--color-negative)',
            lineHeight: 1,
          }}>
            {formatCurrency(animatedLiabilities)}
          </p>
        </div>
      </div>
    </motion.div>
  )
}
