'use client'

import { motion } from 'framer-motion'
import ForecastChart from '@/components/ui/ForecastChart'
import { mockMonthlyData, mockAccounts } from '@/lib/data'

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

export default function ForecastPage() {
  const avgIncome   = mockMonthlyData.reduce((s, m) => s + m.income,   0) / mockMonthlyData.length
  const avgExpenses = mockMonthlyData.reduce((s, m) => s + m.expenses, 0) / mockMonthlyData.length
  const avgSavings  = avgIncome - avgExpenses

  const checkingBalance = mockAccounts.find(a => a.accountType === 'checking')?.balance ?? 12450
  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const now = new Date()

  const historicalMonths = mockMonthlyData.slice(-3).map((m, i) => ({
    month: m.month,
    balance: checkingBalance - (avgSavings * (2 - i)),
    projected: false,
  }))
  historicalMonths[historicalMonths.length - 1].balance = checkingBalance

  const projectedMonths = Array.from({ length: 6 }, (_, i) => {
    const futureDate = new Date(now.getFullYear(), now.getMonth() + i + 1, 1)
    return {
      month: monthNames[futureDate.getMonth()],
      balance: Math.round(checkingBalance + avgSavings * (i + 1)),
      projected: true,
    }
  })

  const forecastData = [...historicalMonths, ...projectedMonths]
  const emergencyFundMonths = checkingBalance / avgExpenses

  const summaryItems = [
    { label: 'Avg Monthly Income',   value: avgIncome,   color: '#2D6A4F' },
    { label: 'Avg Monthly Expenses', value: avgExpenses, color: '#8B2635' },
    { label: 'Avg Monthly Savings',  value: avgSavings,  color: '#B8913A' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
        {summaryItems.map(({ label, value, color }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut', delay: i * 0.06 }}
            style={{ backgroundColor: '#FFFFFF', border: '1px solid rgba(184,145,58,0.15)', borderRadius: '2px', padding: '24px' }}
          >
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: '#A89880', textTransform: 'uppercase', letterSpacing: '0.16em', marginBottom: '10px' }}>{label}</p>
            <p style={{ fontFamily: 'var(--font-serif)', fontSize: '28px', fontWeight: 400, color }}>{fmt(value)}</p>
          </motion.div>
        ))}
      </div>

      {/* Forecast chart */}
      <div style={card}>
        <p style={sectionLabel}>Checking Balance — 6-Month Projection</p>
        <ForecastChart data={forecastData} emergencyFundMonths={emergencyFundMonths} />
      </div>

      {/* Projection table */}
      <div style={card}>
        <p style={sectionLabel}>Projected Monthly Balances</p>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Month', 'Projected Balance', 'Type'].map(h => (
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
            {projectedMonths.map(({ month, balance }, i) => (
              <tr key={month} style={{ backgroundColor: i % 2 === 0 ? 'transparent' : 'rgba(184,145,58,0.02)' }}>
                <td style={{ padding: '13px 16px', fontFamily: 'var(--font-serif)', fontSize: '15px', color: '#1A1714', borderBottom: '1px solid rgba(184,145,58,0.07)' }}>{month}</td>
                <td style={{ padding: '13px 16px', fontFamily: 'var(--font-serif)', fontSize: '15px', color: '#2D6A4F', borderBottom: '1px solid rgba(184,145,58,0.07)' }}>{fmt(balance)}</td>
                <td style={{ padding: '13px 16px', borderBottom: '1px solid rgba(184,145,58,0.07)' }}>
                  <span style={{
                    fontSize: '9px',
                    color: '#B8913A',
                    fontFamily: 'var(--font-mono)',
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    border: '1px solid rgba(184,145,58,0.3)',
                    padding: '2px 7px',
                    borderRadius: '2px',
                  }}>
                    Projected
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
