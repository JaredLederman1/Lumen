'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, type Variants } from 'framer-motion'

const ALL_CATEGORIES = [
  'Income', 'Groceries', 'Dining', 'Entertainment',
  'Transport', 'Utilities', 'Shopping', 'Health', 'Travel', 'Other',
]

interface TransactionRowProps {
  id: string
  merchantName: string | null
  amount: number
  category: string | null
  date: Date | string
  pending?: boolean
  accountName?: string | null
  last4?: string | null
  recurring?: boolean
  onCategoryChange?: (id: string, category: string) => void
}

function formatCurrency(n: number) {
  const abs = Math.abs(n)
  const formatted = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(abs)
  return n < 0 ? `-${formatted}` : `+${formatted}`
}

function formatCategory(cat: string) {
  return cat.replace(/\s*—\s*/g, ' ').replace(/_/g, ' ')
}

function formatDate(d: Date | string) {
  const date = typeof d === 'string' ? new Date(d) : d
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export const rowVariants: Variants = {
  hidden: { opacity: 0, y: 5 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.22 } },
}

export default function TransactionRow({
  id, merchantName, amount, category, date, pending,
  accountName, last4, recurring, onCategoryChange,
}: TransactionRowProps) {
  const isIncome = amount > 0
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const selectRef = useRef<HTMLSelectElement>(null)

  const accountLabel = accountName
    ? last4 ? `${accountName} ····${last4}` : accountName
    : null

  useEffect(() => {
    if (editing) selectRef.current?.focus()
  }, [editing])

  async function handleCategoryChange(newCat: string) {
    setEditing(false)
    if (newCat === (category ?? '')) return
    setSaving(true)
    try {
      const { supabase } = await import('@/lib/supabase')
      const { data: { session } } = await supabase.auth.getSession()
      await fetch(`/api/transactions/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ category: newCat }),
      })
      onCategoryChange?.(id, newCat)
    } finally {
      setSaving(false)
    }
  }

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
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '16px', color: 'var(--color-text)', fontFamily: 'var(--font-mono)', fontWeight: 500 }}>
            {merchantName ?? 'Unknown Merchant'}
          </span>
          {pending && (
            <span style={{
              fontSize: '11px', color: '#B8913A', fontFamily: 'var(--font-mono)',
              letterSpacing: '0.1em', textTransform: 'uppercase',
              border: '1px solid rgba(184,145,58,0.4)', padding: '1px 5px', borderRadius: '2px',
            }}>
              Pending
            </span>
          )}
          {recurring && (
            <span style={{
              fontSize: '11px', color: '#4A6785', fontFamily: 'var(--font-mono)',
              letterSpacing: '0.1em', textTransform: 'uppercase',
              border: '1px solid rgba(74,103,133,0.35)', padding: '1px 5px', borderRadius: '2px',
            }}>
              Recurring
            </span>
          )}

          {/* Category badge: click to edit */}
          {editing ? (
            <select
              ref={selectRef}
              defaultValue={category ?? ''}
              onBlur={e => handleCategoryChange(e.target.value)}
              onChange={e => handleCategoryChange(e.target.value)}
              onClick={e => e.stopPropagation()}
              style={{
                fontSize: '11px', fontFamily: 'var(--font-mono)', letterSpacing: '0.08em',
                textTransform: 'uppercase', color: '#1A1714',
                border: '1px solid rgba(184,145,58,0.5)', borderRadius: '2px',
                padding: '1px 4px', backgroundColor: '#FFFFFF', cursor: 'pointer',
                outline: 'none',
              }}
            >
              {ALL_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          ) : (
            <span
              onClick={e => { e.stopPropagation(); setEditing(true) }}
              title="Click to edit category"
              style={{
                fontSize: '11px', color: saving ? '#B8913A' : '#A89880', fontFamily: 'var(--font-mono)',
                letterSpacing: '0.1em', textTransform: 'uppercase',
                border: `1px solid ${saving ? 'rgba(184,145,58,0.4)' : 'rgba(184,145,58,0.15)'}`,
                padding: '1px 5px', borderRadius: '2px',
                cursor: 'pointer',
                userSelect: 'none',
              }}
            >
              {saving ? 'saving...' : (category ? formatCategory(category) : 'uncategorized')}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '13px', color: '#A89880', fontFamily: 'var(--font-mono)' }}>
            {formatDate(date)}
          </span>
          {accountLabel && (
            <span style={{ fontSize: '13px', color: '#B8913A', fontFamily: 'var(--font-mono)', opacity: 0.7 }}>
              {accountLabel}
            </span>
          )}
        </div>
      </div>
      <span style={{
        fontFamily: 'var(--font-sans)',
        fontSize: '20px',
        fontWeight: 400,
        color: isIncome ? '#2D6A4F' : '#8B2635',
        flexShrink: 0,
      }}>
        {formatCurrency(amount)}
      </span>
    </motion.div>
  )
}
