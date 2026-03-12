'use client'

import { motion } from 'framer-motion'
import { mockMonthlyData } from '@/lib/mockData'
import BarChart from '@/components/ui/BarChart'

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

const card = {
  backgroundColor: '#FFFFFF',
  border: '1px solid rgba(184,145,58,0.15)',
  borderRadius: '2px',
  padding: '28px',
} as const

const sectionLabel = {
  fontFamily: 'var(--font-mono)',
  fontSize: '10px',
  color: '#A89880',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.16em',
  marginBottom: '22px',
} as const

export default function CashFlowPage() {
  const recent = mockMonthlyData.slice(-3)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Monthly spotlight cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
        {recent.map(({ month, income, expenses, savings }) => {
          const savingsRate = ((savings / income) * 100).toFixed(0)
          return (
            <motion.div
              key={month}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              style={{ backgroundColor: '#FFFFFF', border: '1px solid rgba(184,145,58,0.15)', borderRadius: '2px', padding: '24px' }}
            >
              <p style={{ fontFamily: 'var(--font-serif)', fontSize: '18px', fontWeight: 400, color: '#B8913A', marginBottom: '20px', letterSpacing: '0.02em' }}>
                {month} 2026
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '11px' }}>
                {[
                  { label: 'Income',       value: fmt(income),   color: '#2D6A4F' },
                  { label: 'Expenses',     value: fmt(expenses), color: '#8B2635' },
                ].map(r => (
                  <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ fontSize: '11px', color: '#A89880', fontFamily: 'var(--font-mono)', letterSpacing: '0.04em' }}>{r.label}</span>
                    <span style={{ fontFamily: 'var(--font-serif)', fontSize: '16px', color: r.color }}>{r.value}</span>
                  </div>
                ))}
                <div style={{ borderTop: '1px solid rgba(184,145,58,0.12)', paddingTop: '11px', display: 'flex', flexDirection: 'column', gap: '11px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ fontSize: '11px', color: '#A89880', fontFamily: 'var(--font-mono)', letterSpacing: '0.04em' }}>Net Savings</span>
                    <span style={{ fontFamily: 'var(--font-serif)', fontSize: '16px', color: '#1A1714' }}>{fmt(savings)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ fontSize: '11px', color: '#A89880', fontFamily: 'var(--font-mono)', letterSpacing: '0.04em' }}>Savings Rate</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: '#B8913A', fontWeight: 500 }}>{savingsRate}%</span>
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
        <BarChart data={mockMonthlyData} />
      </div>

      {/* Table */}
      <div style={card}>
        <p style={sectionLabel}>Monthly Breakdown</p>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Month', 'Income', 'Expenses', 'Net Savings', 'Rate'].map(h => (
                  <th key={h} style={{
                    padding: '8px 16px 12px',
                    textAlign: 'left',
                    fontSize: '10px',
                    color: '#A89880',
                    fontFamily: 'var(--font-mono)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.12em',
                    fontWeight: 400,
                    borderBottom: '1px solid rgba(184,145,58,0.2)',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {mockMonthlyData.map(({ month, income, expenses, savings }, i) => {
                const rate = ((savings / income) * 100).toFixed(0)
                const isEven = i % 2 === 0
                return (
                  <tr key={month} style={{ backgroundColor: isEven ? 'transparent' : 'rgba(184,145,58,0.02)' }}>
                    <td style={{ padding: '13px 16px', fontFamily: 'var(--font-serif)', fontSize: '15px', color: '#1A1714', borderBottom: '1px solid rgba(184,145,58,0.07)' }}>{month}</td>
                    <td style={{ padding: '13px 16px', fontFamily: 'var(--font-serif)', fontSize: '15px', color: '#2D6A4F', borderBottom: '1px solid rgba(184,145,58,0.07)' }}>{fmt(income)}</td>
                    <td style={{ padding: '13px 16px', fontFamily: 'var(--font-serif)', fontSize: '15px', color: '#8B2635', borderBottom: '1px solid rgba(184,145,58,0.07)' }}>{fmt(expenses)}</td>
                    <td style={{ padding: '13px 16px', fontFamily: 'var(--font-serif)', fontSize: '15px', color: '#1A1714', borderBottom: '1px solid rgba(184,145,58,0.07)' }}>{fmt(savings)}</td>
                    <td style={{ padding: '13px 16px', fontFamily: 'var(--font-mono)', fontSize: '12px', color: '#B8913A', borderBottom: '1px solid rgba(184,145,58,0.07)', fontWeight: 500 }}>{rate}%</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
