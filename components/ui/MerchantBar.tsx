'use client'

import { motion } from 'framer-motion'
import DataTooltip from '@/components/ui/DataTooltip'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

interface MerchantBarProps {
  name: string
  totalSpent: number
  transactionCount: number
  category: string | null
  percentOfTotal: number
  maxPercent: number
  lastDate: string
  formatter: (n: number) => string
  isLast?: boolean
}

export default function MerchantBar({
  name,
  totalSpent,
  transactionCount,
  category,
  percentOfTotal,
  maxPercent,
  lastDate,
  formatter,
  isLast,
}: MerchantBarProps) {
  const fillPercent = maxPercent > 0 ? (percentOfTotal / maxPercent) * 100 : 0

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '10px 0',
        borderBottom: isLast ? 'none' : '1px solid var(--color-border)',
      }}
    >
      {/* Vertical bar track */}
      <div
        style={{
          width: '3px',
          height: '36px',
          backgroundColor: 'rgba(255,255,255,0.06)',
          borderRadius: '2px',
          flexShrink: 0,
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'flex-end',
        }}
      >
        <motion.div
          initial={{ height: '0%' }}
          animate={{ height: `${fillPercent}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          style={{
            width: '100%',
            backgroundColor: 'var(--color-gold)',
            borderRadius: '2px',
          }}
        />
      </div>

      {/* Name + transaction count + category badge */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '14px',
            color: 'var(--color-text)',
            marginBottom: '2px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {name}
        </p>
        <p
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            color: 'var(--color-text-muted)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            flexWrap: 'wrap',
          }}
        >
          {transactionCount} transaction{transactionCount !== 1 ? 's' : ''}
          {category && (
            <>
              <span>·</span>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '10px',
                  textTransform: 'uppercase',
                  color: 'var(--color-gold)',
                  backgroundColor: 'var(--color-gold-subtle)',
                  padding: '2px 6px',
                  borderRadius: '2px',
                }}
              >
                {category}
              </span>
            </>
          )}
        </p>
      </div>

      {/* Amount + percent */}
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <DataTooltip
          value={totalSpent}
          title={name}
          computationNote={`Sum of ${transactionCount} transaction${transactionCount !== 1 ? 's' : ''} in the last 30 days`}
          sources={[{
            label: `${transactionCount} transaction${transactionCount !== 1 ? 's' : ''}`,
            value: totalSpent,
            type: 'computed',
            detail: `Most recent: ${formatDate(lastDate)}`,
          }]}
          formatter={formatter}
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '15px',
            color: 'var(--color-negative)',
            display: 'block',
          }}
        />
        <p
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            color: 'var(--color-text-muted)',
            marginTop: '2px',
          }}
        >
          {percentOfTotal.toFixed(1)}%
        </p>
      </div>
    </div>
  )
}
