'use client'

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

export default function DashboardPage() {
  const recentTransactions = mockTransactions.slice(0, 10)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <NetWorthCard
        current={mockNetWorth.current}
        lastMonth={mockNetWorth.lastMonth}
        totalAssets={mockNetWorth.totalAssets}
        totalLiabilities={mockNetWorth.totalLiabilities}
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
          <DonutChart data={mockSpendingByCategory} />
        </div>
        <div style={card}>
          <p style={label}>Income vs Expenses — Last 6 Months</p>
          <BarChart data={mockMonthlyData} />
        </div>
      </motion.div>

      {/* Transactions */}
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
          {recentTransactions.map((tx) => (
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
