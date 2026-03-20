'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import type { Variants } from 'framer-motion'
import Link from 'next/link'
import BarChart from '@/components/ui/BarChart'
import MerchantBar from '@/components/ui/MerchantBar'
import { useDashboard } from '@/lib/dashboardData'

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

const card = {
  backgroundColor: 'var(--color-surface)',
  border: '1px solid var(--color-gold-border)',
  borderRadius: '2px',
  padding: '28px',
} as const

const sectionLabel = {
  fontFamily: 'var(--font-mono)',
  fontSize: '12px',
  color: 'var(--color-text-muted)',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.16em',
  marginBottom: '22px',
} as const

interface MerchantSummary {
  name: string
  totalSpent: number
  transactionCount: number
  lastDate: string
  category: string | null
  accountIds: string[]
  percentOfTotal: number
}

interface MerchantData {
  merchants: MerchantSummary[]
  totalSpend: number
  periodLabel: string
}

const merchantItemVariants: Variants = {
  hidden: { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0 },
}

export default function CashFlowPage() {
  const { loading, monthlyData } = useDashboard()
  const [merchantData, setMerchantData] = useState<MerchantData | null>(null)

  useEffect(() => {
    fetch('/api/merchants')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.merchants) setMerchantData(d) })
      .catch(() => {})
  }, [])

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '320px' }}>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', color: 'var(--color-text-muted)', letterSpacing: '0.06em' }}>Loading…</p>
      </div>
    )
  }

  if (monthlyData.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px', gap: '20px', textAlign: 'center' }}
      >
        <div style={{ width: '48px', height: '48px', borderRadius: '50%', border: '1px solid var(--color-gold-border)', backgroundColor: 'var(--color-gold-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
          ◈
        </div>
        <div>
          <p style={{ fontFamily: 'var(--font-serif)', fontSize: '26px', fontWeight: 400, color: 'var(--color-text)', marginBottom: '8px' }}>No cash flow data</p>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', color: 'var(--color-text-muted)', lineHeight: 1.7 }}>Connect a bank account to see your income, expenses, and savings trends.</p>
        </div>
        <Link href="/dashboard/accounts" style={{ padding: '10px 24px', backgroundColor: 'var(--color-gold)', border: 'none', borderRadius: '2px', color: 'var(--color-text)', fontFamily: 'var(--font-mono)', fontSize: '13px', letterSpacing: '0.08em', textDecoration: 'none', display: 'inline-block' }}>
          Connect an Account
        </Link>
      </motion.div>
    )
  }

  const recent = monthlyData.slice(-3)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Monthly spotlight cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
        {recent.map(({ month, year, income, expenses, savings }) => {
          const savingsRate = income > 0 ? ((savings / income) * 100).toFixed(0) : '0'
          return (
            <motion.div
              key={`${month}-${year}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-gold-border)', borderRadius: '2px', padding: '24px' }}
            >
              <p style={{ fontFamily: 'var(--font-serif)', fontSize: '24px', fontWeight: 400, color: 'var(--color-gold)', marginBottom: '20px', letterSpacing: '0.02em' }}>
                {month}{year ? ` ${year}` : ''}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '11px' }}>
                {[
                  { label: 'Income',   value: fmt(income),   color: 'var(--color-positive)' },
                  { label: 'Expenses', value: fmt(expenses), color: 'var(--color-negative)' },
                ].map(r => (
                  <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ fontSize: '13px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)', letterSpacing: '0.04em' }}>{r.label}</span>
                    <span style={{ fontFamily: 'var(--font-sans)', fontSize: '24px', color: r.color }}>{r.value}</span>
                  </div>
                ))}
                <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '11px', display: 'flex', flexDirection: 'column', gap: '11px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ fontSize: '13px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)', letterSpacing: '0.04em' }}>Net Savings</span>
                    <span style={{ fontFamily: 'var(--font-sans)', fontSize: '24px', color: 'var(--color-text)' }}>{fmt(savings)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ fontSize: '13px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)', letterSpacing: '0.04em' }}>Savings Rate</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '18px', color: 'var(--color-gold)', fontWeight: 500 }}>{savingsRate}%</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Chart */}
      <div style={card}>
        <p style={sectionLabel}>6-Month Overview</p>
        <BarChart data={monthlyData} />
      </div>

      {/* Table */}
      <div style={card}>
        <p style={sectionLabel}>Monthly Breakdown</p>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Month', 'Income', 'Expenses', 'Net Savings', 'Rate'].map(h => (
                  <th key={h} style={{ padding: '8px 16px 12px', textAlign: 'left', fontSize: '12px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 400, borderBottom: '1px solid var(--color-border-strong)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...monthlyData].reverse().map(({ month, year, income, expenses, savings }, i) => {
                const rate = income > 0 ? ((savings / income) * 100).toFixed(0) : '0'
                return (
                  <tr key={`${month}-${year}-${i}`} style={{ backgroundColor: i % 2 === 0 ? 'transparent' : 'var(--color-surface-texture)' }}>
                    <td style={{ padding: '13px 16px', fontFamily: 'var(--font-serif)', fontSize: '20px', color: 'var(--color-text)', borderBottom: '1px solid var(--color-border)' }}>
                      {month}{year ? ` ${year}` : ''}
                    </td>
                    <td style={{ padding: '13px 16px', fontFamily: 'var(--font-sans)', fontSize: '20px', color: 'var(--color-positive)', borderBottom: '1px solid var(--color-border)' }}>{fmt(income)}</td>
                    <td style={{ padding: '13px 16px', fontFamily: 'var(--font-sans)', fontSize: '20px', color: 'var(--color-negative)', borderBottom: '1px solid var(--color-border)' }}>{fmt(expenses)}</td>
                    <td style={{ padding: '13px 16px', fontFamily: 'var(--font-sans)', fontSize: '20px', color: 'var(--color-text)', borderBottom: '1px solid var(--color-border)' }}>{fmt(savings)}</td>
                    <td style={{ padding: '13px 16px', fontFamily: 'var(--font-mono)', fontSize: '17px', color: 'var(--color-gold)', borderBottom: '1px solid var(--color-border)', fontWeight: 500 }}>{rate}%</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top Merchants */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut', delay: 0.1 }}
        style={card}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px' }}>
          <p style={sectionLabel}>Top Merchants, Last 30 Days</p>
          {merchantData && (
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--color-text-muted)' }}>
              Total spend: <span style={{ color: 'var(--color-text)' }}>{fmt(merchantData.totalSpend)}</span>
            </p>
          )}
        </div>

        {!merchantData ? (
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--color-text-muted)', textAlign: 'center', padding: '20px 0' }}>
            Loading merchant data...
          </p>
        ) : merchantData.merchants.length === 0 ? (
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--color-text-muted)', textAlign: 'center', padding: '20px 0' }}>
            No expense transactions found in the last 30 days.
          </p>
        ) : (
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.04 } } }}
          >
            {merchantData.merchants.map((merchant, i) => (
              <motion.div
                key={merchant.name}
                variants={merchantItemVariants}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              >
                <MerchantBar
                  name={merchant.name}
                  totalSpent={merchant.totalSpent}
                  transactionCount={merchant.transactionCount}
                  category={merchant.category}
                  percentOfTotal={merchant.percentOfTotal}
                  maxPercent={merchantData.merchants[0].percentOfTotal}
                  lastDate={merchant.lastDate}
                  formatter={fmt}
                  isLast={i === merchantData.merchants.length - 1}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}
