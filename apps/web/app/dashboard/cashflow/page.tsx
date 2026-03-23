'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import type { Variants } from 'framer-motion'
import Link from 'next/link'
import BarChart from '@/components/ui/BarChart'
import MerchantBar from '@/components/ui/MerchantBar'
import MobileCard from '@/components/ui/MobileCard'
import { useDashboard } from '@/lib/dashboardData'
import { useIsMobile } from '@/hooks/useIsMobile'
import { colors, fonts, spacing, mobileLabelText } from '@/lib/theme'

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

interface CategoryTrend {
  name: string
  monthlyAmounts: Array<{ key: string, amount: number }>
  totalSpent: number
  avgMonthly: number
  trend: 'up' | 'down' | 'stable'
  changePercent: number
}

interface TrendsData {
  categoryTrends: CategoryTrend[]
  allMonthKeys: string[]
  monthCount: number
}

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

function CashFlowDesktop() {
  const { loading, monthlyData, authToken } = useDashboard()
  const [merchantData, setMerchantData] = useState<MerchantData | null>(null)
  const [trendsData, setTrendsData] = useState<TrendsData | null>(null)

  useEffect(() => {
    const headers: Record<string, string> = authToken ? { Authorization: `Bearer ${authToken}` } : {}
    fetch('/api/merchants', { headers })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.merchants) setMerchantData(d) })
      .catch(() => {})
    fetch('/api/cashflow/trends', { headers })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.categoryTrends) setTrendsData(d) })
      .catch(() => {})
  }, [authToken])

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '320px' }}>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', color: 'var(--color-text-muted)', letterSpacing: '0.06em' }}>Loading...</p>
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

      {/* Category Trends */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut', delay: 0.15 }}
        style={card}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px' }}>
          <p style={sectionLabel}>Spending by Category, Last 6 Months</p>
          {trendsData && (
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--color-text-muted)' }}>
              {trendsData.monthCount} months of data
            </p>
          )}
        </div>

        {!trendsData ? (
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--color-text-muted)', textAlign: 'center', padding: '20px 0' }}>
            Loading category data...
          </p>
        ) : trendsData.categoryTrends.length === 0 ? (
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--color-text-muted)', textAlign: 'center', padding: '20px 0' }}>
            No category data available.
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Category', 'Trend', 'Avg / Month', '6-Mo Total', 'Last 6 Months'].map((h, i) => (
                    <th
                      key={h}
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '11px',
                        textTransform: 'uppercase',
                        color: 'var(--color-text-muted)',
                        letterSpacing: '0.1em',
                        padding: '0 0 10px 0',
                        textAlign: i === 4 ? 'right' : 'left',
                        fontWeight: 400,
                        borderBottom: '1px solid var(--color-border-strong)',
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {trendsData.categoryTrends.map((cat) => {
                  const maxAmount = Math.max(...cat.monthlyAmounts.map(m => m.amount), 1)
                  const trendColor =
                    cat.trend === 'up' ? 'var(--color-negative)' :
                    cat.trend === 'down' ? 'var(--color-positive)' :
                    'var(--color-text-muted)'
                  const trendArrow =
                    cat.trend === 'up' ? '↑' :
                    cat.trend === 'down' ? '↓' :
                    '→'
                  const trendLabel =
                    cat.trend === 'up' ? `+${cat.changePercent}%` :
                    cat.trend === 'down' ? `-${Math.abs(cat.changePercent)}%` :
                    'stable'

                  return (
                    <tr key={cat.name}>
                      <td style={{ padding: '12px 0', borderBottom: '1px solid var(--color-border)', paddingRight: '20px' }}>
                        <span style={{ fontFamily: 'var(--font-serif)', fontSize: '15px', color: 'var(--color-text)' }}>
                          {cat.name}
                        </span>
                      </td>
                      <td style={{ padding: '12px 0', borderBottom: '1px solid var(--color-border)', paddingRight: '20px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontFamily: 'var(--font-mono)', fontSize: '12px', color: trendColor }}>
                          <span>{trendArrow}</span>
                          <span>{trendLabel}</span>
                        </span>
                      </td>
                      <td style={{ padding: '12px 0', borderBottom: '1px solid var(--color-border)', paddingRight: '20px' }}>
                        <span style={{ fontFamily: 'var(--font-serif)', fontSize: '14px', color: 'var(--color-text)' }}>
                          {fmt(cat.avgMonthly)}
                        </span>
                      </td>
                      <td style={{ padding: '12px 0', borderBottom: '1px solid var(--color-border)', paddingRight: '20px' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--color-text-muted)' }}>
                          {fmt(cat.totalSpent)}
                        </span>
                      </td>
                      <td style={{ padding: '12px 0', borderBottom: '1px solid var(--color-border)', textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '28px', justifyContent: 'flex-end' }}>
                          {trendsData.allMonthKeys.map((key) => {
                            const entry = cat.monthlyAmounts.find(m => m.key === key)
                            const amount = entry?.amount ?? 0
                            const isMax = amount === maxAmount && amount > 0
                            const heightPct = amount > 0 ? Math.max((amount / maxAmount) * 28, 2) : 0
                            return (
                              <div
                                key={key}
                                style={{
                                  width: '8px',
                                  height: `${heightPct}px`,
                                  borderRadius: '1px',
                                  background: 'var(--color-gold)',
                                  opacity: isMax ? 1 : 0.7,
                                  flexShrink: 0,
                                }}
                              />
                            )
                          })}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

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

function CashFlowMobile() {
  const { loading, monthlyData, authToken } = useDashboard()
  const [merchantData, setMerchantData] = useState<MerchantData | null>(null)
  const [trendsData, setTrendsData] = useState<TrendsData | null>(null)

  useEffect(() => {
    const headers: Record<string, string> = authToken ? { Authorization: `Bearer ${authToken}` } : {}
    fetch('/api/merchants', { headers })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.merchants) setMerchantData(d) })
      .catch(() => {})
    fetch('/api/cashflow/trends', { headers })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.categoryTrends) setTrendsData(d) })
      .catch(() => {})
  }, [authToken])

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '240px' }}>
        <p style={{ fontFamily: fonts.mono, fontSize: '14px', color: colors.textMuted, letterSpacing: '0.06em' }}>Loading...</p>
      </div>
    )
  }

  if (monthlyData.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '320px', gap: spacing.sectionGap, textAlign: 'center', padding: spacing.pagePad }}
      >
        <div style={{ width: '48px', height: '48px', borderRadius: '50%', border: `1px solid ${colors.goldBorder}`, backgroundColor: colors.goldSubtle, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
          ◈
        </div>
        <div>
          <p style={{ fontFamily: fonts.serif, fontSize: '22px', fontWeight: 400, color: colors.text, marginBottom: '8px' }}>No cash flow data</p>
          <p style={{ fontFamily: fonts.mono, fontSize: '13px', color: colors.textMuted, lineHeight: 1.7 }}>Connect a bank account to see your income, expenses, and savings trends.</p>
        </div>
        <Link
          href="/dashboard/accounts"
          style={{ minHeight: spacing.tapTarget, display: 'flex', alignItems: 'center', padding: '0 24px', backgroundColor: colors.gold, borderRadius: '2px', color: colors.text, fontFamily: fonts.mono, fontSize: '13px', letterSpacing: '0.08em', textDecoration: 'none' }}
        >
          Connect an Account
        </Link>
      </motion.div>
    )
  }

  const recent = monthlyData.slice(-3)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sectionGap }}>

      {/* Month spotlight cards: horizontal scroll row */}
      {/* RN: use FlatList horizontal */}
      <div style={{ overflowX: 'auto', display: 'flex', gap: spacing.sectionGap, paddingBottom: spacing.tightGap }}>
        {recent.map(({ month, year, income, expenses, savings }, idx) => {
          const savingsRate = income > 0 ? ((savings / income) * 100).toFixed(0) : '0'
          return (
            <motion.div
              key={`${month}-${year}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut', delay: idx * 0.04 }}
              style={{ flexShrink: 0, width: '240px' }}
            >
              <MobileCard>
                {/* Month name */}
                <p style={{ fontFamily: fonts.serif, fontSize: 20, color: colors.gold, marginBottom: spacing.rowGap }}>
                  {month}{year ? ` ${year}` : ''}
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.tightGap }}>
                  {/* Income row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', minHeight: spacing.tapTarget }}>
                    <span style={{ fontFamily: fonts.mono, fontSize: 12, color: colors.textMuted }}>Income</span>
                    <span style={{ fontFamily: fonts.sans, fontSize: 20, color: colors.positive }}>{fmt(income)}</span>
                  </div>

                  {/* Expenses row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', minHeight: spacing.tapTarget }}>
                    <span style={{ fontFamily: fonts.mono, fontSize: 12, color: colors.textMuted }}>Expenses</span>
                    <span style={{ fontFamily: fonts.sans, fontSize: 20, color: colors.negative }}>{fmt(expenses)}</span>
                  </div>

                  {/* Divider */}
                  <div style={{ borderTop: `1px solid ${colors.border}`, marginTop: spacing.tightGap, paddingTop: spacing.tightGap, display: 'flex', flexDirection: 'column', gap: spacing.tightGap }}>
                    {/* Net Savings row */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', minHeight: spacing.tapTarget }}>
                      <span style={{ fontFamily: fonts.mono, fontSize: 12, color: colors.textMuted }}>Net Savings</span>
                      <span style={{ fontFamily: fonts.sans, fontSize: 20, color: colors.text }}>{fmt(savings)}</span>
                    </div>

                    {/* Savings Rate row */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', minHeight: spacing.tapTarget }}>
                      <span style={{ fontFamily: fonts.mono, fontSize: 12, color: colors.textMuted }}>Savings Rate</span>
                      <span style={{ fontFamily: fonts.mono, fontSize: 20, color: colors.gold }}>{savingsRate}%</span>
                    </div>
                  </div>
                </div>
              </MobileCard>
            </motion.div>
          )
        })}
      </div>

      {/* 6-month overview bar chart */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut', delay: 0.12 }}
      >
        <MobileCard>
          <p style={{ ...mobileLabelText, marginBottom: spacing.rowGap }}>6-MONTH OVERVIEW</p>
          <BarChart data={monthlyData} />
        </MobileCard>
      </motion.div>

      {/* Top merchants */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut', delay: 0.16 }}
      >
        <MobileCard>
          <p style={{ ...mobileLabelText, marginBottom: spacing.rowGap }}>TOP MERCHANTS</p>

          {!merchantData ? (
            <p style={{ fontFamily: fonts.mono, fontSize: 12, color: colors.textMuted, textAlign: 'center', padding: '16px 0' }}>
              Loading merchant data...
            </p>
          ) : merchantData.merchants.length === 0 ? (
            <p style={{ fontFamily: fonts.mono, fontSize: 12, color: colors.textMuted, textAlign: 'center', padding: '16px 0' }}>
              No expense transactions found in the last 30 days.
            </p>
          ) : (
            <motion.div
              initial="hidden"
              animate="visible"
              variants={{ visible: { transition: { staggerChildren: 0.04 } } }}
              style={{ display: 'flex', flexDirection: 'column' }}
            >
              {merchantData.merchants.map((merchant, i) => (
                <motion.div
                  key={merchant.name}
                  variants={merchantItemVariants}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                  style={{
                    display: 'flex',
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    minHeight: spacing.tapTarget,
                    borderBottom: i < merchantData.merchants.length - 1 ? `1px solid ${colors.border}` : 'none',
                    paddingTop: spacing.tightGap,
                    paddingBottom: spacing.tightGap,
                  }}
                >
                  {/* Name and category badge */}
                  <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: spacing.tightGap, flex: 1, marginRight: spacing.tightGap }}>
                    <span style={{ fontFamily: fonts.serif, fontSize: 15, color: colors.text }}>
                      {merchant.name}
                    </span>
                    {merchant.category && (
                      <span style={{
                        fontFamily: fonts.mono,
                        fontSize: 10,
                        color: colors.gold,
                        backgroundColor: colors.goldSubtle,
                        paddingTop: 2,
                        paddingBottom: 2,
                        paddingLeft: 6,
                        paddingRight: 6,
                        borderRadius: 2,
                      }}>
                        {merchant.category}
                      </span>
                    )}
                  </div>

                  {/* Amount */}
                  <span style={{ fontFamily: fonts.serif, fontSize: 15, color: merchant.totalSpent < 0 ? colors.negative : colors.text, flexShrink: 0 }}>
                    {fmt(merchant.totalSpent)}
                  </span>
                </motion.div>
              ))}
            </motion.div>
          )}
        </MobileCard>
      </motion.div>

    </div>
  )
}

export default function CashFlowPage() {
  const isMobile = useIsMobile()
  return isMobile ? <CashFlowMobile /> : <CashFlowDesktop />
}
