'use client'

import { motion } from 'framer-motion'

interface NetWorthCardProps {
  current: number
  lastMonth: number
  totalAssets: number
  totalLiabilities: number
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

export default function NetWorthCard({ current, lastMonth, totalAssets, totalLiabilities }: NetWorthCardProps) {
  const change = current - lastMonth
  const changePct = ((change / lastMonth) * 100).toFixed(1)
  const isPositive = change >= 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      style={{
        backgroundColor: '#FFFFFF',
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
          fontSize: '10px',
          color: '#A89880',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          marginBottom: '12px',
        }}>
          Net Worth
        </p>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '18px', flexWrap: 'wrap', marginBottom: '10px' }}>
          <span style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '60px',
            fontWeight: 300,
            color: '#1A1714',
            lineHeight: 1,
            letterSpacing: '-0.01em',
          }}>
            {formatCurrency(current)}
          </span>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            fontFamily: 'var(--font-mono)',
            fontSize: '12px',
            color: isPositive ? '#2D6A4F' : '#8B2635',
            backgroundColor: isPositive ? 'rgba(45,106,79,0.08)' : 'rgba(139,38,53,0.08)',
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
          fontSize: '11px',
          color: '#A89880',
          letterSpacing: '0.04em',
        }}>
          vs last month
        </p>
      </div>

      {/* Divider */}
      <div style={{ width: '1px', height: '80px', backgroundColor: 'rgba(184,145,58,0.15)', flexShrink: 0 }} />

      {/* Assets + Liabilities */}
      <div style={{ display: 'flex', gap: '48px', alignItems: 'center' }}>
        <div>
          <p style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            color: '#A89880',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            marginBottom: '10px',
          }}>
            Total Assets
          </p>
          <p style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '30px',
            fontWeight: 400,
            color: '#1A1714',
            lineHeight: 1,
          }}>
            {formatCurrency(totalAssets)}
          </p>
        </div>

        <div style={{ width: '1px', height: '52px', backgroundColor: 'rgba(184,145,58,0.15)' }} />

        <div>
          <p style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            color: '#A89880',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            marginBottom: '10px',
          }}>
            Total Liabilities
          </p>
          <p style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '30px',
            fontWeight: 400,
            color: '#8B2635',
            lineHeight: 1,
          }}>
            {formatCurrency(totalLiabilities)}
          </p>
        </div>
      </div>
    </motion.div>
  )
}
