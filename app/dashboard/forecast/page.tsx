'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import ForecastChart from '@/components/ui/ForecastChart'
import DataTooltip from '@/components/ui/DataTooltip'
import { useDashboard } from '@/lib/dashboardData'

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

const card = {
  backgroundColor: '#0F1318',
  border: '1px solid rgba(184,145,58,0.15)',
  borderRadius: '2px',
  padding: '28px',
} as const

const sectionLabel = {
  fontFamily: 'var(--font-mono)',
  fontSize: '12px',
  color: '#6B7A8D',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.16em',
  marginBottom: '22px',
} as const

export default function ForecastPage() {
  const { loading, forecast } = useDashboard()

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '320px' }}>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', color: '#6B7A8D', letterSpacing: '0.06em' }}>Loading…</p>
      </div>
    )
  }

  if (!forecast) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px', gap: '20px', textAlign: 'center' }}
      >
        <div style={{ width: '48px', height: '48px', borderRadius: '50%', border: '1px solid rgba(184,145,58,0.25)', backgroundColor: 'rgba(184,145,58,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
          ◈
        </div>
        <div>
          <p style={{ fontFamily: 'var(--font-serif)', fontSize: '26px', fontWeight: 400, color: '#F0F2F8', marginBottom: '8px' }}>No forecast data</p>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', color: '#6B7A8D', lineHeight: 1.7 }}>Connect a bank account to generate a 6-month cash flow projection.</p>
        </div>
        <Link href="/dashboard/accounts" style={{ padding: '10px 24px', backgroundColor: '#B8913A', border: 'none', borderRadius: '2px', color: '#F0F2F8', fontFamily: 'var(--font-mono)', fontSize: '13px', letterSpacing: '0.08em', textDecoration: 'none', display: 'inline-block' }}>
          Connect an Account
        </Link>
      </motion.div>
    )
  }

  const { avgIncome, avgExpenses, avgSavings, emergencyFundMonths, historicalMonths, projectedMonths } = forecast
  const forecastData = [...historicalMonths, ...projectedMonths]

  const summaryCards = [
    {
      label: 'Avg Monthly Income',
      value: avgIncome,
      color: '#4CAF7D',
      tooltipTitle: 'Avg Monthly Income',
      tooltipNote: 'Average monthly income over the last 6 months',
      tooltipSources: [{
        label: 'Monthly average, last 6 months',
        value: avgIncome,
        type: 'average' as const,
        detail: 'Based on positive transaction amounts',
      }],
    },
    {
      label: 'Avg Monthly Expenses',
      value: avgExpenses,
      color: '#E05C6E',
      tooltipTitle: 'Avg Monthly Expenses',
      tooltipNote: 'Average monthly spending over the last 6 months',
      tooltipSources: [{
        label: 'Monthly average, last 6 months',
        value: avgExpenses,
        type: 'average' as const,
        detail: 'Based on negative transaction amounts',
      }],
    },
    {
      label: 'Avg Monthly Savings',
      value: avgSavings,
      color: '#B8913A',
      tooltipTitle: 'Avg Monthly Savings',
      tooltipNote: 'Average income minus average expenses',
      tooltipSources: [
        { label: 'Avg Income', value: avgIncome, type: 'average' as const },
        { label: 'Avg Expenses', value: -avgExpenses, type: 'average' as const },
      ],
    },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
        {summaryCards.map(({ label, value, color, tooltipTitle, tooltipNote, tooltipSources }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut', delay: i * 0.06 }}
            style={{ backgroundColor: '#0F1318', border: '1px solid rgba(184,145,58,0.15)', borderRadius: '2px', padding: '24px' }}
          >
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: '#6B7A8D', textTransform: 'uppercase', letterSpacing: '0.16em', marginBottom: '10px' }}>{label}</p>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '41px', fontWeight: 400, color }}>
              <DataTooltip
                value={value}
                title={tooltipTitle}
                computationNote={tooltipNote}
                sources={tooltipSources}
              />
            </p>
          </motion.div>
        ))}
      </div>

      <div style={card}>
        <p style={sectionLabel}>Checking Balance: 6-Month Projection</p>
        <ForecastChart data={forecastData} emergencyFundMonths={emergencyFundMonths} />
      </div>

      <div style={card}>
        <p style={sectionLabel}>Projected Monthly Balances</p>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Month', 'Projected Balance', 'Type'].map(h => (
                <th key={h} style={{ padding: '8px 16px 12px', textAlign: 'left', fontSize: '12px', color: '#6B7A8D', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 400, borderBottom: '1px solid rgba(184,145,58,0.2)' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {projectedMonths.map(({ month, balance }, i) => (
              <tr key={`${month}-${i}`} style={{ backgroundColor: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                <td style={{ padding: '13px 16px', fontFamily: 'var(--font-serif)', fontSize: '20px', color: '#F0F2F8', borderBottom: '1px solid rgba(184,145,58,0.07)' }}>{month}</td>
                <td style={{ padding: '13px 16px', fontFamily: 'var(--font-sans)', fontSize: '20px', color: '#4CAF7D', borderBottom: '1px solid rgba(184,145,58,0.07)' }}>{fmt(balance)}</td>
                <td style={{ padding: '13px 16px', borderBottom: '1px solid rgba(184,145,58,0.07)' }}>
                  <span style={{ fontSize: '11px', color: '#B8913A', fontFamily: 'var(--font-mono)', letterSpacing: '0.12em', textTransform: 'uppercase', border: '1px solid rgba(184,145,58,0.3)', padding: '2px 7px', borderRadius: '2px' }}>
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
