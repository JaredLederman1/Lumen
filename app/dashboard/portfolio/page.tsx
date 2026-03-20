'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'

interface PortfolioAccount {
  id: string
  institutionName: string
  accountType: string
  balance: number
  last4: string | null
}

interface AllocationSlice {
  label: string
  value: number
  percentage: number
}

interface PortfolioData {
  accounts: PortfolioAccount[]
  totalValue: number
  allocationByType: AllocationSlice[]
  hasInvestments: boolean
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

function allocationColor(label: string): string {
  const t = label.toLowerCase()
  if (t === 'brokerage' || t === 'investment') return 'var(--color-positive)'
  if (t === '401k' || t === '403b' || t === 'roth 401k' || t === 'simple ira' || t === 'sep ira') return 'var(--color-gold)'
  if (t === 'ira' || t === 'roth') return 'var(--color-info)'
  if (t === '529' || t === 'ugma' || t === 'utma') return 'color-mix(in srgb, var(--color-gold) 50%, var(--color-info))'
  if (t === 'pension' || t === 'retirement' || t === 'profit sharing plan' || t === 'keogh') return 'var(--color-text-mid)'
  return 'var(--color-text-muted)'
}

const card = {
  backgroundColor: 'var(--color-surface)',
  border: '1px solid var(--color-gold-border)',
  borderRadius: '2px',
  padding: '28px',
} as const

const labelStyle = {
  fontFamily: 'var(--font-mono)',
  fontSize: '12px',
  color: 'var(--color-text-muted)',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.16em',
  marginBottom: '22px',
} as const

export default function PortfolioPage() {
  const [data, setData] = useState<PortfolioData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/portfolio')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
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

  if (!data || !data.hasInvestments) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          minHeight: '400px', gap: '20px', textAlign: 'center',
        }}
      >
        <div style={{
          width: '48px', height: '48px', borderRadius: '50%',
          border: '1px solid rgba(184,145,58,0.25)',
          backgroundColor: 'var(--color-gold-subtle)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '24px',
        }}>
          ◈
        </div>
        <div>
          <p style={{ fontFamily: 'var(--font-serif)', fontSize: '26px', fontWeight: 400, color: 'var(--color-text)', marginBottom: '8px' }}>
            No investment accounts detected
          </p>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', color: 'var(--color-text-muted)', lineHeight: 1.7 }}>
            Connect a brokerage, 401k, or retirement account via Accounts to see your portfolio here.
          </p>
        </div>
        <Link
          href="/dashboard/accounts"
          style={{
            padding: '10px 24px',
            backgroundColor: 'var(--color-gold)',
            border: 'none',
            borderRadius: '2px',
            color: 'var(--color-text)',
            fontFamily: 'var(--font-mono)',
            fontSize: '13px',
            letterSpacing: '0.08em',
            textDecoration: 'none',
            display: 'inline-block',
          }}
        >
          Connect an Account
        </Link>
      </motion.div>
    )
  }

  const largestSlice = data.allocationByType.reduce(
    (best, s) => (s.value > best.value ? s : best),
    data.allocationByType[0]
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Summary bar */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut', delay: 0 }}
        style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}
      >
        <div style={{ ...card, padding: '24px' }}>
          <p style={{ ...labelStyle, marginBottom: '10px' }}>Total Portfolio Value</p>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '41px', fontWeight: 400, color: 'var(--color-positive)' }}>
            {fmt(data.totalValue)}
          </p>
        </div>
        <div style={{ ...card, padding: '24px' }}>
          <p style={{ ...labelStyle, marginBottom: '10px' }}>Number of Accounts</p>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '41px', fontWeight: 400, color: 'var(--color-text)' }}>
            {data.accounts.length}
          </p>
        </div>
        <div style={{ ...card, padding: '24px' }}>
          <p style={{ ...labelStyle, marginBottom: '10px' }}>Largest Position</p>
          <p style={{
            fontFamily: 'var(--font-serif)', fontSize: '41px', fontWeight: 400, color: 'var(--color-text)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {largestSlice?.label ?? '--'}
          </p>
        </div>
      </motion.div>

      {/* Allocation */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut', delay: 0.08 }}
        style={card}
      >
        <p style={labelStyle}>Allocation</p>

        {/* Stacked bar */}
        <div style={{
          display: 'flex', width: '100%', height: '8px', borderRadius: '2px', overflow: 'hidden',
          marginBottom: '20px',
        }}>
          {data.allocationByType.map((slice) => (
            <div
              key={slice.label}
              style={{
                flexShrink: 0,
                width: `${slice.percentage}%`,
                backgroundColor: allocationColor(slice.label),
              }}
            />
          ))}
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
          {data.allocationByType.map((slice) => (
            <div key={slice.label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0,
                backgroundColor: allocationColor(slice.label),
              }} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {slice.label}
              </span>
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: '18px', color: 'var(--color-text)' }}>
                {fmt(slice.value)}
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', color: 'var(--color-text-muted)' }}>
                {slice.percentage.toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Account list */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut', delay: 0.16 }}
        style={card}
      >
        <p style={labelStyle}>Accounts</p>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {data.accounts.map((account, i) => (
            <div
              key={account.id}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                paddingTop: i === 0 ? '0' : '16px',
                paddingBottom: i === data.accounts.length - 1 ? '0' : '16px',
                borderBottom: i === data.accounts.length - 1 ? 'none' : '1px solid var(--color-border)',
              }}
            >
              <div>
                <p style={{ fontFamily: 'var(--font-serif)', fontSize: '19px', color: 'var(--color-text)', fontWeight: 400, marginBottom: '6px' }}>
                  {account.institutionName}
                </p>
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--color-gold)',
                  backgroundColor: 'var(--color-gold-subtle)', padding: '2px 6px', borderRadius: '2px',
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                }}>
                  {account.accountType}
                </span>
              </div>
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: '26px', fontWeight: 400, color: 'var(--color-text)' }}>
                {fmt(account.balance)}
              </p>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  )
}
