'use client'

import { motion, type Variants } from 'framer-motion'

interface TransactionRowProps {
  merchantName: string | null
  amount: number
  category: string | null
  date: Date | string
  pending?: boolean
}

function formatCurrency(n: number) {
  const abs = Math.abs(n)
  const formatted = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(abs)
  return n < 0 ? `−${formatted}` : `+${formatted}`
}

function formatDate(d: Date | string) {
  const date = typeof d === 'string' ? new Date(d) : d
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export const rowVariants: Variants = {
  hidden: { opacity: 0, y: 5 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.22 } },
}

export default function TransactionRow({ merchantName, amount, category, date, pending }: TransactionRowProps) {
  const isIncome = amount > 0

  return (
    <motion.div
      variants={rowVariants}
      whileHover={{ backgroundColor: 'rgba(184,145,58,0.03)' }}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '13px 10px',
        borderBottom: '1px solid rgba(184,145,58,0.1)',
        cursor: 'pointer',
        borderRadius: '1px',
        marginLeft: '-10px',
        marginRight: '-10px',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            fontSize: '13px',
            color: '#1A1714',
            fontFamily: 'var(--font-mono)',
            fontWeight: 500,
          }}>
            {merchantName ?? 'Unknown Merchant'}
          </span>
          {pending && (
            <span style={{
              fontSize: '9px',
              color: '#B8913A',
              fontFamily: 'var(--font-mono)',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              border: '1px solid rgba(184,145,58,0.4)',
              padding: '1px 5px',
              borderRadius: '2px',
            }}>
              Pending
            </span>
          )}
          {category && (
            <span style={{
              fontSize: '9px',
              color: '#A89880',
              fontFamily: 'var(--font-mono)',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              border: '1px solid rgba(184,145,58,0.15)',
              padding: '1px 5px',
              borderRadius: '2px',
            }}>
              {category}
            </span>
          )}
        </div>
        <span style={{ fontSize: '11px', color: '#A89880', fontFamily: 'var(--font-mono)' }}>
          {formatDate(date)}
        </span>
      </div>
      <span style={{
        fontFamily: 'var(--font-serif)',
        fontSize: '17px',
        fontWeight: 400,
        color: isIncome ? '#2D6A4F' : '#8B2635',
        flexShrink: 0,
      }}>
        {formatCurrency(amount)}
      </span>
    </motion.div>
  )
}
