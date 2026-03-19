'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import TransactionRow from '@/components/ui/TransactionRow'
import Link from 'next/link'
import { useDashboard } from '@/lib/dashboardData'
import { detectRecurringMerchants } from '@/lib/data'
import { supabase } from '@/lib/supabase'

const CATEGORY_MAP: Record<string, string[]> = {
  Income:        ['INCOME', 'TRANSFER_IN'],
  Groceries:     ['FOOD_AND_DRINK'],
  Dining:        ['FOOD_AND_DRINK'],
  Entertainment: ['ENTERTAINMENT', 'RECREATION'],
  Transport:     ['TRANSPORTATION', 'TRAVEL'],
  Utilities:     ['HOME_IMPROVEMENT', 'UTILITIES', 'RENT_AND_UTILITIES'],
  Shopping:      ['GENERAL_MERCHANDISE', 'PERSONAL_CARE', 'APPAREL_AND_ACCESSORIES'],
  Health:        ['MEDICAL', 'HEALTHCARE'],
  Travel:        ['TRAVEL', 'TRANSPORTATION'],
}
const CATEGORIES = ['All', ...Object.keys(CATEGORY_MAP)]
const TX_CATEGORIES = Object.keys(CATEGORY_MAP)
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

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  backgroundColor: '#FDFBF8',
  border: '1px solid rgba(184,145,58,0.25)',
  borderRadius: '2px',
  color: '#1A1714',
  fontSize: '13px',
  fontFamily: 'var(--font-mono)',
  outline: 'none',
} as const

const labelStyle = {
  display: 'block',
  fontFamily: 'var(--font-mono)',
  fontSize: '10px',
  letterSpacing: '0.1em',
  textTransform: 'uppercase' as const,
  color: '#A89880',
  marginBottom: '6px',
}

export default function TransactionsPage() {
  const { loading, accounts, transactions, refresh } = useDashboard()

  const [search,        setSearch]        = useState('')
  const [category,      setCategory]      = useState('All')
  const [accountFilter, setAccountFilter] = useState('All')
  const [page,          setPage]          = useState(1)

  // Modal state
  const [modalOpen,   setModalOpen]   = useState(false)
  const [submitting,  setSubmitting]  = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [form, setForm] = useState({
    merchantName: '',
    amount:       '',
    type:         'expense',
    category:     TX_CATEGORIES[1],
    date:         new Date().toISOString().slice(0, 10),
    accountId:    'cash',
  })

  // Optimistic category overrides: txId -> category string
  const [categoryOverrides, setCategoryOverrides] = useState<Record<string, string>>({})

  const handleCategoryChange = (txId: string, cat: string) => {
    setCategoryOverrides(prev => ({ ...prev, [txId]: cat }))
  }

  const accountMap = useMemo(() =>
    Object.fromEntries(accounts.map(a => [a.id, a])),
  [accounts])

  const recurringMerchants = useMemo(() => detectRecurringMerchants(transactions), [transactions])

  const filtered = useMemo(() => {
    return transactions.filter(tx => {
      const matchSearch   = !search || (tx.merchantName ?? '').toLowerCase().includes(search.toLowerCase())
      const matchCategory = category === 'All' || (CATEGORY_MAP[category] ?? [category]).includes(tx.category ?? '')
      const matchAccount  = accountFilter === 'All' || tx.accountId === accountFilter
      return matchSearch && matchCategory && matchAccount
    })
  }, [transactions, search, category, accountFilter])

  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)

  const handleSubmit = async () => {
    if (!form.amount || isNaN(Number(form.amount))) {
      setSubmitError('Please enter a valid amount.')
      return
    }
    setSubmitting(true)
    setSubmitError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/transactions/manual', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const err = await res.json()
        setSubmitError(err.error ?? 'Something went wrong.')
        return
      }
      setModalOpen(false)
      setForm({ merchantName: '', amount: '', type: 'expense', category: TX_CATEGORIES[1], date: new Date().toISOString().slice(0, 10), accountId: 'cash' })
      refresh()
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '320px' }}>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: '#A89880', letterSpacing: '0.06em' }}>Loading…</p>
      </div>
    )
  }

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
    <>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Filters + Add button */}
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
          placeholder="Search merchant..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
          style={{ ...controlStyle, minWidth: '200px' }}
        />
        <select value={category} onChange={e => { setCategory(e.target.value); setPage(1) }} style={controlStyle}>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={accountFilter} onChange={e => { setAccountFilter(e.target.value); setPage(1) }} style={controlStyle}>
          <option value="All">All Accounts</option>
          {accounts.map(a => (
            <option key={a.id} value={a.id}>{a.institutionName}{a.last4 ? ` .... ${a.last4}` : ''}</option>
          ))}
        </select>
        {(search || category !== 'All' || accountFilter !== 'All') && (
          <button
            onClick={() => { setSearch(''); setCategory('All'); setAccountFilter('All'); setPage(1) }}
            style={{
              padding: '8px 12px',
              backgroundColor: 'transparent',
              border: '1px solid rgba(184,145,58,0.25)',
              borderRadius: '2px',
              color: '#A89880',
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            Reset Filters
          </button>
        )}
        <span style={{ fontSize: '11px', color: '#A89880', fontFamily: 'var(--font-mono)', marginLeft: 'auto', letterSpacing: '0.04em' }}>
          {filtered.length} transactions
        </span>
        <button
          onClick={() => setModalOpen(true)}
          style={{
            padding: '8px 16px',
            backgroundColor: '#B8913A',
            border: 'none',
            borderRadius: '2px',
            color: '#FFFFFF',
            fontSize: '11px',
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          + Add Transaction
        </button>
      </div>

      {/* List */}
      <div style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid rgba(184,145,58,0.15)',
        borderRadius: '2px',
        padding: '28px',
      }}>
        {transactions.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '200px', gap: '20px', textAlign: 'center' }}>
            <p style={{ fontFamily: 'var(--font-serif)', fontSize: '22px', fontWeight: 400, color: '#1A1714', marginBottom: '8px' }}>No transactions yet</p>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: '#A89880', lineHeight: 1.7 }}>Connect a bank account or add a transaction manually.</p>
            <Link href="/dashboard/accounts" style={{ padding: '10px 24px', backgroundColor: '#B8913A', border: 'none', borderRadius: '2px', color: '#FFFFFF', fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.08em', textDecoration: 'none', display: 'inline-block' }}>
              Connect an Account
            </Link>
          </div>
        ) : paginated.length === 0 ? (
          <p style={{ fontSize: '13px', color: '#A89880', fontFamily: 'var(--font-mono)', textAlign: 'center', padding: '40px 0' }}>
            No transactions match your filters
          </p>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={`${category}-${accountFilter}-${search}-${page}`}
              initial="hidden"
              animate="visible"
              variants={{ visible: { transition: { staggerChildren: 0.025 } } }}
            >
              {paginated.map(tx => {
                const acct = accountMap[tx.accountId]
                return (
                  <TransactionRow
                    key={tx.id}
                    id={tx.id}
                    merchantName={tx.merchantName}
                    amount={tx.amount}
                    category={categoryOverrides[tx.id] ?? tx.category}
                    date={tx.date}
                    pending={tx.pending}
                    accountName={acct?.institutionName ?? null}
                    last4={acct?.last4 ?? null}
                    recurring={tx.merchantName ? recurringMerchants.has(tx.merchantName) : false}
                    onCategoryChange={handleCategoryChange}
                  />
                )
              })}
            </motion.div>
          </AnimatePresence>
        )}

        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', marginTop: '24px', paddingTop: '20px', borderTop: '1px solid rgba(184,145,58,0.1)' }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={pageBtn(page === 1)}>Prev</button>
            <span style={{ fontSize: '11px', color: '#A89880', fontFamily: 'var(--font-mono)', padding: '0 8px' }}>
              {page} / {totalPages}
            </span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={pageBtn(page === totalPages)}>Next</button>
          </div>
        )}
      </div>
    </div>

    {/* ── Add Transaction Modal ─────────────────────────────── */}
    <AnimatePresence>
      {modalOpen && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setModalOpen(false)}
            style={{
              position: 'fixed', inset: 0, backgroundColor: 'rgba(26,23,20,0.5)',
              backdropFilter: 'blur(4px)', zIndex: 50,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            {/* Panel — stopPropagation prevents backdrop click from closing when clicking inside */}
            <motion.div
              key="modal"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              transition={{ duration: 0.28, ease: 'easeOut' }}
              onClick={e => e.stopPropagation()}
              style={{
                width: '100%', maxWidth: '480px',
                backgroundColor: '#FFFFFF',
                border: '1px solid rgba(184,145,58,0.25)',
                borderRadius: '4px',
                padding: '32px',
                zIndex: 51,
                display: 'flex', flexDirection: 'column', gap: '20px',
              }}
            >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ fontFamily: 'var(--font-serif)', fontSize: '20px', fontWeight: 400, color: '#1A1714', margin: 0 }}>
                Add Transaction
              </p>
              <button
                onClick={() => setModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#A89880', fontSize: '18px', lineHeight: 1 }}
              >
                ×
              </button>
            </div>

            {/* Type toggle */}
            <div>
              <label style={labelStyle}>Type</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {(['expense', 'income'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setForm(f => ({ ...f, type: t }))}
                    style={{
                      flex: 1, padding: '9px 0',
                      backgroundColor: form.type === t ? '#B8913A' : '#FDFBF8',
                      border: `1px solid ${form.type === t ? '#B8913A' : 'rgba(184,145,58,0.25)'}`,
                      borderRadius: '2px',
                      color: form.type === t ? '#FFFFFF' : '#6B5D4A',
                      fontFamily: 'var(--font-mono)', fontSize: '11px',
                      letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer',
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Merchant */}
            <div>
              <label style={labelStyle}>Merchant / Description</label>
              <input
                type="text"
                placeholder="e.g. Whole Foods"
                value={form.merchantName}
                onChange={e => setForm(f => ({ ...f, merchantName: e.target.value }))}
                style={inputStyle}
              />
            </div>

            {/* Amount */}
            <div>
              <label style={labelStyle}>Amount</label>
              <input
                type="number"
                placeholder="0.00"
                min="0"
                step="0.01"
                value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                style={inputStyle}
              />
            </div>

            {/* Category + Date row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={labelStyle}>Category</label>
                <select
                  value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  style={{ ...inputStyle, cursor: 'pointer' }}
                >
                  {TX_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Date</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  style={inputStyle}
                />
              </div>
            </div>

            {/* Account */}
            <div>
              <label style={labelStyle}>Account</label>
              <select
                value={form.accountId}
                onChange={e => setForm(f => ({ ...f, accountId: e.target.value }))}
                style={{ ...inputStyle, cursor: 'pointer' }}
              >
                <option value="cash">Cash</option>
                {accounts.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.institutionName}{a.last4 ? ` .... ${a.last4}` : ''}
                  </option>
                ))}
              </select>
            </div>

            {submitError && (
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: '#8B2635', margin: 0 }}>
                {submitError}
              </p>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
              <button
                onClick={() => setModalOpen(false)}
                style={{
                  flex: 1, padding: '11px 0',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid rgba(184,145,58,0.25)',
                  borderRadius: '2px', cursor: 'pointer',
                  fontFamily: 'var(--font-mono)', fontSize: '11px',
                  letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6B5D4A',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                style={{
                  flex: 2, padding: '11px 0',
                  backgroundColor: '#B8913A', border: 'none',
                  borderRadius: '2px', cursor: submitting ? 'not-allowed' : 'pointer',
                  opacity: submitting ? 0.7 : 1,
                  fontFamily: 'var(--font-mono)', fontSize: '11px',
                  letterSpacing: '0.08em', textTransform: 'uppercase', color: '#FFFFFF',
                }}
              >
                {submitting ? 'Saving…' : 'Save Transaction'}
              </button>
            </div>
            </motion.div>
          </motion.div>
      )}
    </AnimatePresence>
    </>
  )
}

