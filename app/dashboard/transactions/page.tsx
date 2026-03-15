'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import TransactionRow from '@/components/ui/TransactionRow'
import { mockTransactions, mockAccounts } from '@/lib/data'

const CATEGORIES = ['All', 'Income', 'Groceries', 'Dining', 'Entertainment', 'Transport', 'Utilities', 'Shopping', 'Health', 'Travel']
const PAGE_SIZE = 10

const controlStyle = {
  padding: '8px 12px',
  backgroundColor: '#FFFFFF',
  border: '1px solid rgba(184,145,58,0.25)',
  borderRadius: '2px',
  color: '#1A1714',
  fontSize: '12px',
  fontFamily: 'var(--font-mono)',
  outline: 'none',
} as const

export default function TransactionsPage() {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [accountFilter, setAccountFilter] = useState('All')
  const [page, setPage] = useState(1)

  const filtered = useMemo(() => {
    return mockTransactions.filter(tx => {
      const matchSearch = !search || (tx.merchantName ?? '').toLowerCase().includes(search.toLowerCase())
      const matchCategory = category === 'All' || tx.category === category
      const matchAccount = accountFilter === 'All' || tx.accountId === accountFilter
      return matchSearch && matchCategory && matchAccount
    })
  }, [search, category, accountFilter])

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)

  const pageBtn = (active: boolean) => ({
    padding: '6px 14px',
    backgroundColor: active ? '#B8913A' : '#FFFFFF',
    border: '1px solid rgba(184,145,58,0.35)',
    borderRadius: '2px',
    color: active ? '#FFFFFF' : '#B8913A',
    fontSize: '11px',
    fontFamily: 'var(--font-mono)',
    cursor: active ? 'not-allowed' : 'pointer',
    opacity: active ? 0.5 : 1,
  } as const)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Filters */}
      <div style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid rgba(184,145,58,0.15)',
        borderRadius: '2px',
        padding: '20px 24px',
        display: 'flex',
        gap: '12px',
        flexWrap: 'wrap',
        alignItems: 'center',
      }}>
        <input
          type="text"
          placeholder="Search merchant…"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
          style={{ ...controlStyle, minWidth: '200px' }}
        />
        <select value={category} onChange={e => { setCategory(e.target.value); setPage(1) }} style={controlStyle}>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={accountFilter} onChange={e => { setAccountFilter(e.target.value); setPage(1) }} style={controlStyle}>
          <option value="All">All Accounts</option>
          {mockAccounts.map(a => (
            <option key={a.id} value={a.id}>{a.institutionName} ···· {a.last4}</option>
          ))}
        </select>
        <span style={{ fontSize: '11px', color: '#A89880', fontFamily: 'var(--font-mono)', marginLeft: 'auto', letterSpacing: '0.04em' }}>
          {filtered.length} transactions
        </span>
      </div>

      {/* List */}
      <div style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid rgba(184,145,58,0.15)',
        borderRadius: '2px',
        padding: '28px',
      }}>
        {paginated.length === 0 ? (
          <p style={{ fontSize: '13px', color: '#A89880', fontFamily: 'var(--font-mono)', textAlign: 'center', padding: '40px 0' }}>
            No transactions found
          </p>
        ) : (
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.025 } } }}
          >
            {paginated.map(tx => (
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
        )}

        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', marginTop: '24px', paddingTop: '20px', borderTop: '1px solid rgba(184,145,58,0.1)' }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={pageBtn(page === 1)}>
              ← Prev
            </button>
            <span style={{ fontSize: '11px', color: '#A89880', fontFamily: 'var(--font-mono)', padding: '0 8px' }}>
              {page} / {totalPages}
            </span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={pageBtn(page === totalPages)}>
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
