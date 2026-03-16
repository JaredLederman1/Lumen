'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import NetWorthCard from '@/components/ui/NetWorthCard'
import DonutChart from '@/components/ui/DonutChart'
import BarChart from '@/components/ui/BarChart'
import TransactionRow from '@/components/ui/TransactionRow'
import { mockNetWorth, mockTransactions, mockSpendingByCategory, mockMonthlyData } from '@/lib/data'

const card = {
  backgroundColor: '#FFFFFF',
  border: '1px solid rgba(184,145,58,0.15)',
  borderRadius: '2px',
  padding: '28px',
} as const

const label = {
  fontFamily: 'var(--font-mono)',
  fontSize: '10px',
  color: '#A89880',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.16em',
  marginBottom: '22px',
} as const

interface NetWorthState {
  current: number
  lastMonth: number
  totalAssets: number
  totalLiabilities: number
}

interface Transaction {
  id: string
  merchantName: string | null
  amount: number
  category: string | null
  date: string | Date
  pending: boolean
}

interface SpendingCategory {
  category: string
  amount: number
  color: string
}

interface MonthlyData {
  month: string
  income: number
  expenses: number
  savings: number
}

export default function DashboardPage() {
  const [netWorth, setNetWorth] = useState<NetWorthState>({
    current: mockNetWorth.current,
    lastMonth: mockNetWorth.lastMonth,
    totalAssets: mockNetWorth.totalAssets,
    totalLiabilities: mockNetWorth.totalLiabilities,
  })
  const [transactions, setTransactions]       = useState<Transaction[]>(mockTransactions.slice(0, 10) as Transaction[])
  const [monthlyData, setMonthlyData]         = useState<MonthlyData[]>(mockMonthlyData)
  const [spendingByCategory, setSpending]     = useState<SpendingCategory[]>(mockSpendingByCategory)

  useEffect(() => {
    fetch('/api/networth')
      .then(r => r.json())
      .then(d => {
        if (d.netWorth !== undefined) {
          setNetWorth({
            current: d.netWorth,
            lastMonth: d.previousNetWorth ?? d.netWorth,
            totalAssets: d.totalAssets,
            totalLiabilities: d.totalLiabilities,
          })
        }
      })
      .catch(() => {})

    fetch('/api/transactions?limit=10')
      .then(r => r.json())
      .then(d => { if (d.transactions?.length) setTransactions(d.transactions) })
      .catch(() => {})

    fetch('/api/cashflow')
      .then(r => r.json())
      .then(d => {
        if (d.months?.length)           setMonthlyData(d.months)
        if (d.spendingByCategory?.length) setSpending(d.spendingByCategory)
      })
      .catch(() => {})
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <NetWorthCard
        current={netWorth.current}
        lastMonth={netWorth.lastMonth}
        totalAssets={netWorth.totalAssets}
        totalLiabilities={netWorth.totalLiabilities}
      />

      {/* Thin gold rule */}
      <div style={{
        height: '1px',
        background: 'linear-gradient(90deg, transparent, rgba(184,145,58,0.35) 25%, rgba(184,145,58,0.35) 75%, transparent)',
      }} />

      {/* Charts */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut', delay: 0.08 }}
        style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}
      >
        <div style={card}>
          <p style={label}>Spending by Category</p>
          <DonutChart data={spendingByCategory} />
        </div>
        <div style={card}>
          <p style={label}>Income vs Expenses, Last 6 Months</p>
          <BarChart data={monthlyData} />
        </div>
      </motion.div>

      {/* Recent transactions */}
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
          {transactions.map((tx) => (
            <TransactionRow
              key={tx.id}
              merchantName={tx.merchantName}
              amount={tx.amount}
              category={tx.category}
              date={tx.date}
              pending={tx.pending}
            />
          ))}
        </motion.div>
      </motion.div>
    </div>
  )
}
