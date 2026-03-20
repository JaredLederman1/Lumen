'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import NetWorthCard from '@/components/ui/NetWorthCard'
import NetWorthChart from '@/components/ui/NetWorthChart'
import DonutChart from '@/components/ui/DonutChart'
import BarChart from '@/components/ui/BarChart'
import TransactionRow from '@/components/ui/TransactionRow'
import DataTooltip from '@/components/ui/DataTooltip'
import { useDashboard } from '@/lib/dashboardData'
import { detectRecurringMerchants } from '@/lib/data'

interface HistoryPoint { date: string; netWorth: number }
interface NWHistory {
  history: HistoryPoint[]
  hasHistory: boolean
  change30d: number
  changeAllTime: number
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

export default function DashboardPage() {
  const { loading, netWorth, transactions, accounts, monthlyData, spendingByCategory } = useDashboard()
  const [nwHistory, setNwHistory] = useState<NWHistory | null>(null)

  useEffect(() => {
    fetch('/api/networth/history')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setNwHistory(d) })
      .catch(() => {})
  }, [])

  const accountMap = useMemo(() =>
    Object.fromEntries(accounts.map(a => [a.id, a])),
  [accounts])

  const recurringMerchants = useMemo(() => detectRecurringMerchants(transactions), [transactions])

  const hasData = netWorth !== null && (netWorth.totalAssets > 0 || netWorth.totalLiabilities > 0)

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

      {nwHistory?.hasHistory && (
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
