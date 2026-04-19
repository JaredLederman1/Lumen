'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import NetWorthCard from '@/components/ui/NetWorthCard'
import NetWorthChart from '@/components/ui/NetWorthChart'
import NetWorthChartPlaceholder from '@/components/ui/NetWorthChartPlaceholder'
import DonutChart from '@/components/ui/DonutChart'
import BarChart from '@/components/ui/BarChart'
import TransactionRow from '@/components/ui/TransactionRow'
import DataTooltip from '@/components/ui/DataTooltip'
import MobileCard from '@/components/ui/MobileCard'
import MobileMetricCard from '@/components/ui/MobileMetricCard'
import { colors, fonts, spacing, mobileLabelText } from '@/lib/theme'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useDashboard } from '@/lib/dashboardData'
import { detectRecurringMerchants } from '@/lib/data'

interface HistoryPoint { date: string; netWorth: number }
interface NWHistory {
  history: HistoryPoint[]
  hasHistory: boolean
  change30d: number
  changeAllTime: number
  hasAssetAccount: boolean
  hasLiabilityAccount: boolean
}

const card = {
  backgroundColor: '#0F1318',
  border: '1px solid rgba(184,145,58,0.15)',
  borderRadius: '2px',
  padding: '28px',
} as const

const label = {
  fontFamily: 'var(--font-mono)',
  fontSize: '12px',
  color: '#6B7A8D',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.16em',
  marginBottom: '22px',
} as const

function fmtChange(n: number): string {
  const abs = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Math.abs(n))
  return n >= 0 ? `+${abs}` : `-${abs}`
}

function DashboardDesktop() {
  const { loading, netWorth, transactions, accounts, monthlyData, spendingByCategory, authToken } = useDashboard()
  const [nwHistory, setNwHistory] = useState<NWHistory | null>(null)

  useEffect(() => {
    const headers: Record<string, string> = authToken ? { Authorization: `Bearer ${authToken}` } : {}
    fetch('/api/networth/history', { headers })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setNwHistory(d) })
      .catch(() => {})
  }, [authToken])

  const accountMap = useMemo(() =>
    Object.fromEntries(accounts.map(a => [a.id, a])),
  [accounts])

  const recurringMerchants = useMemo(() => detectRecurringMerchants(transactions), [transactions])

  const hasData = netWorth !== null && (netWorth.totalAssets > 0 || netWorth.totalLiabilities > 0)

  const hasFullBalanceSheet =
    !!nwHistory &&
    nwHistory.history.length >= 2 &&
    nwHistory.hasAssetAccount === true &&
    nwHistory.hasLiabilityAccount === true

  // Assets-only with enough history is still a coherent net worth view, so
  // the chart renders there too. The placeholder is only for liability-only.
  const showNetWorthChart =
    hasFullBalanceSheet ||
    (!!nwHistory && nwHistory.history.length >= 2 && nwHistory.hasAssetAccount && !nwHistory.hasLiabilityAccount)

  const showLiabilityOnlyPlaceholder =
    !!nwHistory && nwHistory.hasLiabilityAccount && !nwHistory.hasAssetAccount

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '320px' }}>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', color: '#6B7A8D', letterSpacing: '0.06em' }}>
          Loading…
        </p>
      </div>
    )
  }

  if (!hasData) {
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
          backgroundColor: 'rgba(184,145,58,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '24px',
        }}>
          ◈
        </div>
        <div>
          <p style={{ fontFamily: 'var(--font-serif)', fontSize: '26px', fontWeight: 400, color: '#F0F2F8', marginBottom: '8px' }}>
            No data yet
          </p>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', color: '#6B7A8D', lineHeight: 1.7 }}>
            Connect a bank account to see your net worth, spending, and transactions here.
          </p>
        </div>
        <Link
          href="/dashboard/accounts"
          style={{
            padding: '10px 24px',
            backgroundColor: '#B8913A',
            border: 'none',
            borderRadius: '2px',
            color: '#F0F2F8',
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <NetWorthCard
        current={netWorth.current}
        lastMonth={netWorth.lastMonth}
        totalAssets={netWorth.totalAssets}
        totalLiabilities={netWorth.totalLiabilities}
        accounts={accounts}
      />

      <div style={{
        height: '1px',
        background: 'linear-gradient(90deg, transparent, rgba(184,145,58,0.35) 25%, rgba(184,145,58,0.35) 75%, transparent)',
      }} />

      {showLiabilityOnlyPlaceholder && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut', delay: 0.1 }}
        >
          <NetWorthChartPlaceholder />
        </motion.div>
      )}

      {showNetWorthChart && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut', delay: 0.1 }}
          style={{ backgroundColor: '#0F1318', border: '1px solid rgba(184,145,58,0.15)', borderRadius: '2px', padding: '28px' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
            <div>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: '#6B7A8D', textTransform: 'uppercase', letterSpacing: '0.16em', marginBottom: '4px' }}>
                Net Worth Over Time
              </p>
              <div style={{ display: 'flex', gap: '24px', marginTop: '12px' }}>
                <div>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '4px' }}>
                    30d Change
                  </p>
                  <p style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: '16px',
                    color: nwHistory.change30d >= 0 ? 'var(--color-positive)' : 'var(--color-negative)',
                  }}>
                    {fmtChange(nwHistory.change30d)}
                  </p>
                </div>
                <div>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '4px' }}>
                    All Time
                  </p>
                  <p style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: '16px',
                    color: nwHistory.changeAllTime >= 0 ? 'var(--color-positive)' : 'var(--color-negative)',
                  }}>
                    {fmtChange(nwHistory.changeAllTime)}
                  </p>
                </div>
              </div>
            </div>
          </div>
          <NetWorthChart data={nwHistory.history} height={220} />
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut', delay: 0.08 }}
        style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}
      >
        <div style={card}>
          <p style={label}>Spending by Category</p>
          {spendingByCategory.length > 0 && (() => {
            const totalSpend = spendingByCategory.reduce((s, c) => s + c.amount, 0)
            return (
              <p style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '13px',
                color: 'var(--color-text-muted)',
                marginBottom: '16px',
                marginTop: '-10px',
              }}>
                Total this month:{' '}
                <DataTooltip
                  value={totalSpend}
                  title="Monthly Spending"
                  computationNote="Sum of all categorized expenses in the last 30 days"
                  sources={spendingByCategory.map(c => ({
                    label: c.category,
                    value: c.amount,
                    type: 'computed' as const,
                  }))}
                  style={{ color: 'var(--color-text)', fontFamily: 'var(--font-serif)', fontSize: '15px' }}
                />
              </p>
            )
          })()}
          <DonutChart data={spendingByCategory} />
        </div>
        <div style={card}>
          <p style={label}>Income vs Expenses, Last 6 Months</p>
          <BarChart data={monthlyData} />
        </div>
      </motion.div>

      {transactions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut', delay: 0.16 }}
          style={card}
        >
          <p style={label}>Recent Transactions</p>
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.03 } } }}
          >
            {transactions.slice(0, 10).map((tx) => {
              const acct = accountMap[tx.accountId]
              return (
                <TransactionRow
                  key={tx.id}
                  id={tx.id}
                  merchantName={tx.merchantName}
                  amount={tx.amount}
                  category={tx.category}
                  date={tx.date}
                  pending={tx.pending}
                  accountName={acct?.institutionName ?? null}
                  last4={acct?.last4 ?? null}
                  recurring={tx.merchantName ? recurringMerchants.has(tx.merchantName) : false}
                />
              )
            })}
          </motion.div>
        </motion.div>
      )}
    </div>
  )
}

// ── Currency formatter (used by mobile layout) ────────────────────────────────
const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

// ── Mobile layout ─────────────────────────────────────────────────────────────
function DashboardMobile() {
  const { loading, netWorth, transactions, accounts, monthlyData, spendingByCategory, authToken } = useDashboard()
  const [nwHistory, setNwHistory] = useState<NWHistory | null>(null)

  useEffect(() => {
    const headers: Record<string, string> = authToken ? { Authorization: `Bearer ${authToken}` } : {}
    fetch('/api/networth/history', { headers })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setNwHistory(d) })
      .catch(() => {})
  }, [authToken])

  const accountMap = useMemo(() =>
    Object.fromEntries(accounts.map(a => [a.id, a])),
  [accounts])

  const recurringMerchants = useMemo(() => detectRecurringMerchants(transactions), [transactions])

  const hasData = netWorth !== null && (netWorth.totalAssets > 0 || netWorth.totalLiabilities > 0)

  const hasFullBalanceSheet =
    !!nwHistory &&
    nwHistory.history.length >= 2 &&
    nwHistory.hasAssetAccount === true &&
    nwHistory.hasLiabilityAccount === true

  const showNetWorthChart =
    hasFullBalanceSheet ||
    (!!nwHistory && nwHistory.history.length >= 2 && nwHistory.hasAssetAccount && !nwHistory.hasLiabilityAccount)

  const showLiabilityOnlyPlaceholder =
    !!nwHistory && nwHistory.hasLiabilityAccount && !nwHistory.hasAssetAccount

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '320px' }}>
        <p style={{ fontFamily: fonts.mono, fontSize: '14px', color: colors.textMuted, letterSpacing: '0.06em' }}>
          Loading...
        </p>
      </div>
    )
  }

  if (!hasData) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          minHeight: '400px', gap: '20px', textAlign: 'center',
          paddingLeft: spacing.pagePad, paddingRight: spacing.pagePad,
        }}
      >
        <div style={{
          width: '48px', height: '48px', borderRadius: '50%',
          border: `1px solid ${colors.goldBorder}`,
          backgroundColor: colors.goldSubtle,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '24px',
        }}>
          ◈
        </div>
        <div>
          <p style={{ fontFamily: fonts.serif, fontSize: '26px', fontWeight: 400, color: colors.text, marginBottom: '8px' }}>
            No data yet
          </p>
          <p style={{ fontFamily: fonts.mono, fontSize: '14px', color: colors.textMuted, lineHeight: 1.7 }}>
            Connect a bank account to see your net worth, spending, and transactions here.
          </p>
        </div>
        <Link
          href="/dashboard/accounts"
          style={{
            padding: '12px 24px',
            minHeight: spacing.tapTarget,
            backgroundColor: colors.gold,
            border: 'none',
            borderRadius: '2px',
            color: colors.text,
            fontFamily: fonts.mono,
            fontSize: '13px',
            letterSpacing: '0.08em',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
          }}
        >
          Connect an Account
        </Link>
      </motion.div>
    )
  }

  const sections = [
    // 1. Net worth hero card
    <motion.div
      key="nw-hero"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut', delay: 0 }}
    >
      <MobileCard>
        <p style={{ ...mobileLabelText, marginBottom: spacing.tightGap }}>NET WORTH</p>
        <p style={{ fontFamily: fonts.serif, fontSize: 32, fontWeight: 400, color: colors.positive, lineHeight: 1.1, marginBottom: 8 }}>
          {fmt(netWorth!.current)}
        </p>
        {nwHistory && (
          <p style={{ fontFamily: fonts.mono, fontSize: 12, color: nwHistory.change30d >= 0 ? colors.positive : colors.negative, letterSpacing: '0.04em' }}>
            {fmtChange(nwHistory.change30d)} (30d)
          </p>
        )}
      </MobileCard>
    </motion.div>,

    // 2. Assets + Liabilities metric cards
    <motion.div
      key="metrics"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut', delay: 0.04 }}
      style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 12 }}
    >
      <div style={{ width: 'calc(50% - 6px)' }}>
        <MobileMetricCard
          label="Total Assets"
          value={fmt(netWorth!.totalAssets)}
          valueColor={colors.positive}
        />
      </div>
      <div style={{ width: 'calc(50% - 6px)' }}>
        <MobileMetricCard
          label="Total Liabilities"
          value={fmt(netWorth!.totalLiabilities)}
          valueColor={colors.negative}
        />
      </div>
    </motion.div>,

    // 3. Net worth chart (conditional). Liability-only renders the placeholder
    //    instead, since credit-card-only data is not a full net worth view.
    ...(showNetWorthChart ? [
      <motion.div
        key="nw-chart"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut', delay: 0.08 }}
      >
        <MobileCard>
          <p style={{ ...mobileLabelText, marginBottom: spacing.tightGap }}>NET WORTH OVER TIME</p>
          <NetWorthChart data={nwHistory!.history} height={180} />
        </MobileCard>
      </motion.div>,
    ] : showLiabilityOnlyPlaceholder ? [
      <motion.div
        key="nw-placeholder"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut', delay: 0.08 }}
      >
        <NetWorthChartPlaceholder />
      </motion.div>,
    ] : []),

    // 4. Spending by category
    <motion.div
      key="donut"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut', delay: 0.12 }}
    >
      <MobileCard>
        <p style={{ ...mobileLabelText, marginBottom: spacing.tightGap }}>SPENDING BY CATEGORY</p>
        <DonutChart data={spendingByCategory} />
      </MobileCard>
    </motion.div>,

    // 5. 6-month bar chart
    <motion.div
      key="bar"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut', delay: 0.16 }}
    >
      <MobileCard>
        <p style={{ ...mobileLabelText, marginBottom: spacing.tightGap }}>6-MONTH OVERVIEW</p>
        <BarChart data={monthlyData} />
      </MobileCard>
    </motion.div>,

    // 6. Recent transactions
    ...(transactions.length > 0 ? [
      <motion.div
        key="txns"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut', delay: 0.20 }}
      >
        <MobileCard>
          <p style={{ ...mobileLabelText, marginBottom: spacing.tightGap }}>RECENT</p>
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.04 } } }}
          >
            {transactions.slice(0, 8).map((tx) => {
              const acct = accountMap[tx.accountId]
              return (
                <TransactionRow
                  key={tx.id}
                  id={tx.id}
                  merchantName={tx.merchantName}
                  amount={tx.amount}
                  category={tx.category}
                  date={tx.date}
                  pending={tx.pending}
                  accountName={acct?.institutionName ?? null}
                  last4={acct?.last4 ?? null}
                  recurring={tx.merchantName ? recurringMerchants.has(tx.merchantName) : false}
                />
              )
            })}
          </motion.div>
        </MobileCard>
      </motion.div>,
    ] : []),
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sectionGap }}>
      {sections}
    </div>
  )
}

// ── Device-aware default export ───────────────────────────────────────────────
export default function DashboardPage() {
  const isMobile = useIsMobile()
  return isMobile ? <DashboardMobile /> : <DashboardDesktop />
}
