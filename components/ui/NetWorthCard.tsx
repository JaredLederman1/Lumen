'use client'

import { motion } from 'framer-motion'
import DataTooltip from '@/components/ui/DataTooltip'
import type { TooltipSource } from '@/lib/tooltipContext'

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

export default function NetWorthCard({ current, lastMonth, totalAssets, totalLiabilities, accounts }: NetWorthCardProps) {
  const change = current - lastMonth
  const changePct = ((change / lastMonth) * 100).toFixed(1)
  const isPositive = change >= 0

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
      style={{
        backgroundColor: '#0F1318',
        border: '1px solid rgba(184,145,58,0.18)',
        borderRadius: '2px',
        padding: '36px 40px',
        display: 'flex',
        alignItems: 'center',
        gap: '56px',
      }}
    >
      {/* Primary figure */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '12px',
          color: '#6B7A8D',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          marginBottom: '12px',
        }}>
          Net Worth
        </p>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '18px', flexWrap: 'wrap', marginBottom: '10px' }}>
          <DataTooltip
            value={current}
            title="Net Worth"
            computationNote="Total assets minus total liabilities across all connected accounts"
            sources={netWorthSources}
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '72px',
              fontWeight: 300,
              color: '#F0F2F8',
              lineHeight: 1,
              letterSpacing: '-0.01em',
            }}
          />
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            fontFamily: 'var(--font-mono)',
            fontSize: '14px',
            color: isPositive ? '#4CAF7D' : '#E05C6E',
            backgroundColor: isPositive ? 'rgba(76,175,125,0.10)' : 'rgba(224,92,110,0.10)',
            padding: '4px 10px',
            borderRadius: '2px',
          }}>
            {isPositive ? '↑' : '↓'}
            {formatCurrency(Math.abs(change))}
            <span style={{ opacity: 0.7 }}>({isPositive ? '+' : ''}{changePct}%)</span>
          </span>
        </div>
        <p style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '13px',
          color: '#6B7A8D',
          letterSpacing: '0.04em',
        }}>
          vs last month
        </p>
      </div>

      {/* Divider */}
      <div style={{ width: '1px', height: '80px', backgroundColor: 'rgba(184,145,58,0.18)', flexShrink: 0 }} />

      {/* Assets + Liabilities */}
      <div style={{ display: 'flex', gap: '48px', alignItems: 'center' }}>
        <div>
          <p style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '12px',
            color: '#6B7A8D',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            marginBottom: '10px',
          }}>
            Total Assets
          </p>
          <p style={{
            fontFamily: 'var(--font-sans)',
            fontSize: '36px',
            fontWeight: 400,
            color: '#F0F2F8',
            lineHeight: 1,
          }}>
            {formatCurrency(totalAssets)}
          </p>
        </div>

        <div style={{ width: '1px', height: '52px', backgroundColor: 'rgba(184,145,58,0.18)' }} />

        <div>
          <p style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '12px',
            color: '#6B7A8D',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            marginBottom: '10px',
          }}>
            Total Liabilities
          </p>
          <p style={{
            fontFamily: 'var(--font-sans)',
            fontSize: '36px',
            fontWeight: 400,
            color: '#E05C6E',
            lineHeight: 1,
          }}>
            {formatCurrency(totalLiabilities)}
          </p>
        </div>
      </div>
    </motion.div>
  )
}
