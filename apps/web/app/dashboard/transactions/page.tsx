'use client'

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import TransactionRow from '@/components/ui/TransactionRow'
import MobileCard from '@/components/ui/MobileCard'
import Link from 'next/link'
import { useDashboard } from '@/lib/dashboardData'
import {
  useRecurringExclusionsQuery,
  useUpdateTransactionMutation,
  useAddManualTransactionMutation,
} from '@/lib/queries'
import { detectRecurringMerchants } from '@/lib/data'
import { useIsMobile } from '@/hooks/useIsMobile'
import { colors, fonts, spacing, radius } from '@/lib/theme'

import { CATEGORIES as CANONICAL_CATEGORIES, isMaskedMerchant } from '@/lib/categories'

const CATEGORIES = ['All', ...CANONICAL_CATEGORIES]
const TX_CATEGORIES = [...CANONICAL_CATEGORIES]

const controlStyle = {
  padding: '8px 12px',
  backgroundColor: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(184,145,58,0.25)',
  borderRadius: '2px',
  color: '#F0F2F8',
  fontSize: '14px',
  fontFamily: 'var(--font-mono)',
  outline: 'none',
} as const

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  backgroundColor: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(184,145,58,0.25)',
  borderRadius: '2px',
  color: '#F0F2F8',
  fontSize: '16px',
  fontFamily: 'var(--font-mono)',
  outline: 'none',
} as const

const labelStyle = {
  display: 'block',
  fontFamily: 'var(--font-mono)',
  fontSize: '12px',
  letterSpacing: '0.1em',
  textTransform: 'uppercase' as const,
  color: '#6B7A8D',
  marginBottom: '6px',
}

// Shared modal component used by both desktop and mobile
function AddTransactionModal({
  modalOpen,
  setModalOpen,
  form,
  setForm,
  submitting,
  submitError,
  handleSubmit,
  accounts,
}: {
  modalOpen: boolean
  setModalOpen: (v: boolean) => void
  form: {
    merchantName: string
    amount: string
    type: string
    category: string
    date: string
    accountId: string
  }
  setForm: React.Dispatch<React.SetStateAction<{
    merchantName: string
    amount: string
    type: string
    category: string
    date: string
    accountId: string
  }>>
  submitting: boolean
  submitError: string | null
  handleSubmit: () => void
  accounts: { id: string; institutionName: string; last4?: string | null }[]
}) {
  return (
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
            position: 'fixed', inset: 0, backgroundColor: 'rgba(8,11,15,0.7)',
            backdropFilter: 'blur(4px)', zIndex: 50,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <motion.div
            key="modal"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: '480px',
              backgroundColor: 'var(--color-surface-elevated)',
              border: '1px solid var(--color-border-strong)',
              borderRadius: 'var(--radius-lg)',
              padding: '32px',
              zIndex: 51,
              display: 'flex', flexDirection: 'column', gap: '20px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ fontFamily: 'var(--font-serif)', fontSize: '24px', fontWeight: 400, color: '#F0F2F8', margin: 0 }}>
                Add Transaction
              </p>
              <button
                onClick={() => setModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7A8D', fontSize: '22px', lineHeight: 1 }}
              >
                x
              </button>
            </div>

            <div>
              <label style={labelStyle}>Type</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {(['expense', 'income'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setForm(f => ({ ...f, type: t }))}
                    style={{
                      flex: 1, padding: '9px 0',
                      backgroundColor: form.type === t ? '#B8913A' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${form.type === t ? '#B8913A' : 'rgba(184,145,58,0.25)'}`,
                      borderRadius: '2px',
                      color: form.type === t ? '#F0F2F8' : '#A8B4C0',
                      fontFamily: 'var(--font-mono)', fontSize: '13px',
                      letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer',
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

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
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', color: '#E05C6E', margin: 0 }}>
                {submitError}
              </p>
            )}

            <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
              <button
                onClick={() => setModalOpen(false)}
                style={{
                  flex: 1, padding: '11px 0',
                  backgroundColor: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(184,145,58,0.25)',
                  borderRadius: '2px', cursor: 'pointer',
                  fontFamily: 'var(--font-mono)', fontSize: '13px',
                  letterSpacing: '0.08em', textTransform: 'uppercase', color: '#A8B4C0',
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
                  fontFamily: 'var(--font-mono)', fontSize: '13px',
                  letterSpacing: '0.08em', textTransform: 'uppercase', color: '#F0F2F8',
                }}
              >
                {submitting ? 'Saving...' : 'Save Transaction'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function TransactionsDesktop() {
  const { loading, accounts, transactions } = useDashboard()
  const updateTx = useUpdateTransactionMutation()
  const addManualTx = useAddManualTransactionMutation()
  const { data: exclusionsRaw } = useRecurringExclusionsQuery()

  const [search,        setSearch]        = useState('')
  const [category,      setCategory]      = useState('All')
  const [accountFilter, setAccountFilter] = useState('All')
  const [needsLabelingOnly, setNeedsLabelingOnly] = useState(false)
  const [pageSize,      setPageSize]      = useState(25)
  const [page,          setPage]          = useState(1)

  // Modal state
  const [modalOpen,   setModalOpen]   = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [form, setForm] = useState({
    merchantName: '',
    amount:       '',
    type:         'expense',
    category:     TX_CATEGORIES[1] as string,
    date:         new Date().toISOString().slice(0, 10),
    accountId:    'cash',
  })

  // Inline edit: only one row at a time
  const [editingRowId, setEditingRowId] = useState<string | null>(null)

  // Optimistic overrides
  const [categoryOverrides, setCategoryOverrides] = useState<Record<string, string>>({})
  const [merchantOverrides, setMerchantOverrides] = useState<Record<string, string>>({})
  // Optimistic tag overrides: txId -> tags array
  const [tagOverrides, setTagOverrides] = useState<Record<string, string[]>>({})

  // Toast shown after a "Needs labeling" row is corrected.
  const [toast, setToast] = useState<string | null>(null)
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(t)
  }, [toast])

  // Latest override snapshot, so handleInlineSave can read post-hoc edits
  // without needing to be re-memoized on every keystroke.
  const categoryOverridesRef = useRef(categoryOverrides)
  useEffect(() => { categoryOverridesRef.current = categoryOverrides }, [categoryOverrides])

  const excludedMerchants = useMemo(() => {
    if (!exclusionsRaw) return new Set<string>()
    return new Set(Array.from(exclusionsRaw).map(m => m.trim().toLowerCase()))
  }, [exclusionsRaw])

  const handleTagsChange = (txId: string, tags: string[]) => {
    setTagOverrides(prev => ({ ...prev, [txId]: tags }))
  }

  const handleCategoryChange = (txId: string, cat: string, merchantName?: string) => {
    if (merchantName) {
      setCategoryOverrides(prev => {
        const next = { ...prev }
        transactions
          .filter(tx => tx.merchantName?.toLowerCase() === merchantName.toLowerCase())
          .forEach(tx => { next[tx.id] = cat })
        return next
      })
    } else {
      setCategoryOverrides(prev => ({ ...prev, [txId]: cat }))
    }
  }

  const handleInlineSave = useCallback(async (txId: string, fields: { merchantName?: string; category?: string; applyToMerchant?: boolean }) => {
    const tx = transactions.find(t => t.id === txId)
    const originalMerchant = tx?.merchantName
    const originalCategory = categoryOverridesRef.current[txId] ?? tx?.category
    const wasNeedsLabeling = isMaskedMerchant(originalMerchant) || originalCategory === 'Other'

    const payload = await updateTx.mutateAsync({ id: txId, fields }) as { updatedCount?: number; renameCount?: number }
    if (fields.category) {
      setCategoryOverrides(prev => {
        const next = { ...prev }
        if (fields.applyToMerchant && originalMerchant) {
          transactions
            .filter(t => (t.merchantName ?? '').toLowerCase() === originalMerchant.toLowerCase())
            .forEach(t => { next[t.id] = fields.category! })
        } else {
          next[txId] = fields.category!
        }
        return next
      })
    }
    if (fields.merchantName && originalMerchant) {
      setMerchantOverrides(prev => {
        const next = { ...prev }
        transactions
          .filter(t => (t.merchantName ?? '').toLowerCase() === originalMerchant.toLowerCase())
          .forEach(t => { next[t.id] = fields.merchantName! })
        return next
      })
    }
    if (wasNeedsLabeling) {
      const count = Math.max(payload.renameCount ?? 0, payload.updatedCount ?? 0)
      setToast(`Labeled. ${count} past transactions updated.`)
    }
  }, [transactions, updateTx])

  const accountMap = useMemo(() =>
    Object.fromEntries(accounts.map(a => [a.id, a])),
  [accounts])

  const recurringMerchants = useMemo(() => detectRecurringMerchants(transactions, excludedMerchants), [transactions, excludedMerchants])

  const needsLabelingCount = useMemo(() =>
    transactions.filter(tx => {
      const m = merchantOverrides[tx.id] ?? tx.merchantName
      const c = categoryOverrides[tx.id] ?? tx.category
      return isMaskedMerchant(m) || c === 'Other'
    }).length,
  [transactions, merchantOverrides, categoryOverrides])

  const filtered = useMemo(() => {
    return transactions.filter(tx => {
      const displayMerchant = merchantOverrides[tx.id] ?? tx.merchantName
      const displayCategory = categoryOverrides[tx.id] ?? tx.category
      const matchSearch   = !search || (tx.merchantName ?? '').toLowerCase().includes(search.toLowerCase())
      const matchCategory = category === 'All' || (tx.category ?? '') === category
      const matchAccount  = accountFilter === 'All' || tx.accountId === accountFilter
      const matchNeedsLabeling = !needsLabelingOnly || isMaskedMerchant(displayMerchant) || displayCategory === 'Other'
      return matchSearch && matchCategory && matchAccount && matchNeedsLabeling
    })
  }, [transactions, search, category, accountFilter, needsLabelingOnly, merchantOverrides, categoryOverrides])

  const paginated  = filtered.slice((page - 1) * pageSize, page * pageSize)
  const totalPages = Math.ceil(filtered.length / pageSize)

  const handleSubmit = () => {
    if (!form.amount || isNaN(Number(form.amount))) {
      setSubmitError('Please enter a valid amount.')
      return
    }
    setSubmitError(null)
    addManualTx.mutate(
      {
        merchantName: form.merchantName,
        amount: Number(form.amount),
        type: form.type,
        category: form.category,
        date: form.date,
        accountId: form.accountId,
      },
      {
        onSuccess: () => {
          setModalOpen(false)
          setForm({ merchantName: '', amount: '', type: 'expense', category: TX_CATEGORIES[1], date: new Date().toISOString().slice(0, 10), accountId: 'cash' })
        },
        onError: err => setSubmitError(err instanceof Error ? err.message : 'Something went wrong.'),
      },
    )
  }
  const submitting = addManualTx.isPending

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '320px' }}>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', color: '#6B7A8D', letterSpacing: '0.06em' }}>Loading...</p>
      </div>
    )
  }

  const pageBtn = (active: boolean) => ({
    padding: '6px 14px',
    backgroundColor: active ? 'var(--color-gold)' : 'var(--color-surface)',
    border: '1px solid var(--color-border-strong)',
    borderRadius: 'var(--radius-sm)',
    color: active ? '#F0F2F8' : '#B8913A',
    fontSize: '13px',
    fontFamily: 'var(--font-mono)',
    cursor: active ? 'not-allowed' : 'pointer',
    opacity: active ? 0.5 : 1,
  } as const)

  return (
    <>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Filters + Add button */}
      <div style={{
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-gold-border)',
        borderRadius: 'var(--radius-lg)',
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
        <button
          onClick={() => { setNeedsLabelingOnly(v => !v); setPage(1) }}
          disabled={needsLabelingCount === 0 && !needsLabelingOnly}
          style={{
            padding: '8px 12px',
            backgroundColor: needsLabelingOnly ? '#B8913A' : 'transparent',
            border: `1px solid ${needsLabelingOnly ? '#B8913A' : 'rgba(184,145,58,0.25)'}`,
            borderRadius: '2px',
            color: needsLabelingOnly ? '#F0F2F8' : (needsLabelingCount === 0 ? '#4A5565' : '#B8913A'),
            fontSize: '13px',
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            cursor: needsLabelingCount === 0 && !needsLabelingOnly ? 'not-allowed' : 'pointer',
            opacity: needsLabelingCount === 0 && !needsLabelingOnly ? 0.5 : 1,
            whiteSpace: 'nowrap',
          }}
        >
          Needs Labeling{needsLabelingCount > 0 ? ` (${needsLabelingCount})` : ''}
        </button>
        {(search || category !== 'All' || accountFilter !== 'All' || needsLabelingOnly) && (
          <button
            onClick={() => { setSearch(''); setCategory('All'); setAccountFilter('All'); setNeedsLabelingOnly(false); setPage(1) }}
            style={{
              padding: '8px 12px',
              backgroundColor: 'transparent',
              border: '1px solid rgba(184,145,58,0.25)',
              borderRadius: '2px',
              color: '#6B7A8D',
              fontSize: '13px',
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
        <span style={{ fontSize: '13px', color: '#6B7A8D', fontFamily: 'var(--font-mono)', marginLeft: 'auto', letterSpacing: '0.04em' }}>
          {filtered.length} transactions
        </span>
        <select
          value={pageSize}
          onChange={e => { setPageSize(Number(e.target.value)); setPage(1) }}
          style={controlStyle}
          aria-label="Transactions per page"
        >
          {[25, 50, 100].map(n => <option key={n} value={n}>{n} / page</option>)}
        </select>
        <button
          onClick={() => setModalOpen(true)}
          style={{
            padding: '8px 16px',
            backgroundColor: '#B8913A',
            border: 'none',
            borderRadius: '2px',
            color: '#F0F2F8',
            fontSize: '13px',
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
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-gold-border)',
        borderRadius: 'var(--radius-lg)',
        padding: '28px',
      }}>
        {transactions.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '200px', gap: '20px', textAlign: 'center' }}>
            <p style={{ fontFamily: 'var(--font-serif)', fontSize: '26px', fontWeight: 400, color: '#F0F2F8', marginBottom: '8px' }}>No transactions yet</p>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', color: '#6B7A8D', lineHeight: 1.7 }}>Connect a bank account or add a transaction manually.</p>
            <Link href="/dashboard/accounts" style={{ padding: '10px 24px', backgroundColor: '#B8913A', border: 'none', borderRadius: '2px', color: '#F0F2F8', fontFamily: 'var(--font-mono)', fontSize: '13px', letterSpacing: '0.08em', textDecoration: 'none', display: 'inline-block' }}>
              Connect an Account
            </Link>
          </div>
        ) : paginated.length === 0 ? (
          <p style={{ fontSize: '16px', color: '#6B7A8D', fontFamily: 'var(--font-mono)', textAlign: 'center', padding: '40px 0' }}>
            No transactions match your filters
          </p>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={`${category}-${accountFilter}-${search}-${needsLabelingOnly}-${pageSize}-${page}`}
              initial="hidden"
              animate="visible"
              variants={{ visible: { transition: { staggerChildren: 0.025 } } }}
            >
              {paginated.map(tx => {
                const acct = accountMap[tx.accountId]
                const displayMerchant = merchantOverrides[tx.id] ?? tx.merchantName
                const displayCategory = categoryOverrides[tx.id] ?? tx.category
                return (
                  <TransactionRow
                    key={tx.id}
                    id={tx.id}
                    merchantName={displayMerchant}
                    amount={tx.amount}
                    category={displayCategory}
                    date={tx.date}
                    pending={tx.pending}
                    accountName={acct?.institutionName ?? null}
                    last4={acct?.last4 ?? null}
                    recurring={tx.merchantName ? recurringMerchants.has(tx.merchantName) : false}
                    tags={tagOverrides[tx.id] ?? (tx as { tags?: string[] }).tags ?? []}
                    needsLabeling={isMaskedMerchant(displayMerchant) || displayCategory === 'Other'}
                    editingRowId={editingRowId}
                    onEditRow={setEditingRowId}
                    onSave={handleInlineSave}
                    onCategoryChange={handleCategoryChange}
                    onTagsChange={handleTagsChange}
                  />
                )
              })}
            </motion.div>
          </AnimatePresence>
        )}

        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', marginTop: '24px', paddingTop: '20px', borderTop: '1px solid rgba(184,145,58,0.1)' }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={pageBtn(page === 1)}>Prev</button>
            <span style={{ fontSize: '13px', color: '#6B7A8D', fontFamily: 'var(--font-mono)', padding: '0 8px' }}>
              {page} / {totalPages}
            </span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={pageBtn(page === totalPages)}>Next</button>
          </div>
        )}
      </div>
    </div>

    <AddTransactionModal
      modalOpen={modalOpen}
      setModalOpen={setModalOpen}
      form={form}
      setForm={setForm}
      submitting={submitting}
      submitError={submitError}
      handleSubmit={handleSubmit}
      accounts={accounts}
    />

    <AnimatePresence>
      {toast && (
        <motion.div
          key="labeling-toast"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.2 }}
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 60,
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-info-border)',
            borderRadius: '2px',
            padding: '12px 16px',
            fontFamily: 'var(--font-mono)',
            fontSize: '13px',
            color: 'var(--color-text)',
            letterSpacing: '0.04em',
            boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
          }}
        >
          {toast}
        </motion.div>
      )}
    </AnimatePresence>
    </>
  )
}

function TransactionsMobile() {
  const { loading, accounts, transactions } = useDashboard()
  const updateTx = useUpdateTransactionMutation()
  const addManualTx = useAddManualTransactionMutation()
  const { data: exclusionsRaw } = useRecurringExclusionsQuery()

  const [search,   setSearch]   = useState('')
  const [category, setCategory] = useState('All')
  const [needsLabelingOnly, setNeedsLabelingOnly] = useState(false)
  const [pageSize, setPageSize] = useState(25)
  const [page,     setPage]     = useState(1)

  // Modal state
  const [modalOpen,   setModalOpen]   = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [form, setForm] = useState({
    merchantName: '',
    amount:       '',
    type:         'expense',
    category:     TX_CATEGORIES[1] as string,
    date:         new Date().toISOString().slice(0, 10),
    accountId:    'cash',
  })

  // Optimistic overrides
  const [categoryOverrides, setCategoryOverrides] = useState<Record<string, string>>({})
  const [merchantOverrides, setMerchantOverrides] = useState<Record<string, string>>({})
  const [tagOverrides, setTagOverrides] = useState<Record<string, string[]>>({})

  // Inline edit: only one row at a time
  const [editingRowId, setEditingRowId] = useState<string | null>(null)

  // Toast shown after a "Needs labeling" row is corrected.
  const [toast, setToast] = useState<string | null>(null)
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(t)
  }, [toast])

  const categoryOverridesRef = useRef(categoryOverrides)
  useEffect(() => { categoryOverridesRef.current = categoryOverrides }, [categoryOverrides])

  const excludedMerchants = useMemo(() => {
    if (!exclusionsRaw) return new Set<string>()
    return new Set(Array.from(exclusionsRaw).map(m => m.trim().toLowerCase()))
  }, [exclusionsRaw])

  const handleMobileCategoryChange = (txId: string, cat: string, merchantName?: string) => {
    if (merchantName) {
      setCategoryOverrides(prev => {
        const next = { ...prev }
        transactions
          .filter(tx => tx.merchantName?.toLowerCase() === merchantName.toLowerCase())
          .forEach(tx => { next[tx.id] = cat })
        return next
      })
    } else {
      setCategoryOverrides(prev => ({ ...prev, [txId]: cat }))
    }
  }

  const handleMobileTagsChange = (txId: string, tags: string[]) => {
    setTagOverrides(prev => ({ ...prev, [txId]: tags }))
  }

  const handleMobileInlineSave = useCallback(async (txId: string, fields: { merchantName?: string; category?: string; applyToMerchant?: boolean }) => {
    const tx = transactions.find(t => t.id === txId)
    const originalMerchant = tx?.merchantName
    const originalCategory = categoryOverridesRef.current[txId] ?? tx?.category
    const wasNeedsLabeling = isMaskedMerchant(originalMerchant) || originalCategory === 'Other'

    const payload = await updateTx.mutateAsync({ id: txId, fields }) as { updatedCount?: number; renameCount?: number }
    if (fields.category) {
      setCategoryOverrides(prev => {
        const next = { ...prev }
        if (fields.applyToMerchant && originalMerchant) {
          transactions
            .filter(t => (t.merchantName ?? '').toLowerCase() === originalMerchant.toLowerCase())
            .forEach(t => { next[t.id] = fields.category! })
        } else {
          next[txId] = fields.category!
        }
        return next
      })
    }
    if (fields.merchantName && originalMerchant) {
      setMerchantOverrides(prev => {
        const next = { ...prev }
        transactions
          .filter(t => (t.merchantName ?? '').toLowerCase() === originalMerchant.toLowerCase())
          .forEach(t => { next[t.id] = fields.merchantName! })
        return next
      })
    }
    if (wasNeedsLabeling) {
      const count = Math.max(payload.renameCount ?? 0, payload.updatedCount ?? 0)
      setToast(`Labeled. ${count} past transactions updated.`)
    }
  }, [transactions, updateTx])

  const accountMap = useMemo(() =>
    Object.fromEntries(accounts.map(a => [a.id, a])),
  [accounts])

  const recurringMerchants = useMemo(() =>
    detectRecurringMerchants(transactions, excludedMerchants),
  [transactions, excludedMerchants])

  const needsLabelingCount = useMemo(() =>
    transactions.filter(tx => {
      const m = merchantOverrides[tx.id] ?? tx.merchantName
      const c = categoryOverrides[tx.id] ?? tx.category
      return isMaskedMerchant(m) || c === 'Other'
    }).length,
  [transactions, merchantOverrides, categoryOverrides])

  const filtered = useMemo(() => {
    return transactions.filter(tx => {
      const displayMerchant = merchantOverrides[tx.id] ?? tx.merchantName
      const displayCategory = categoryOverrides[tx.id] ?? tx.category
      const matchSearch   = !search || (tx.merchantName ?? '').toLowerCase().includes(search.toLowerCase())
      const matchCategory = category === 'All' || (tx.category ?? '') === category
      const matchNeedsLabeling = !needsLabelingOnly || isMaskedMerchant(displayMerchant) || displayCategory === 'Other'
      return matchSearch && matchCategory && matchNeedsLabeling
    })
  }, [transactions, search, category, needsLabelingOnly, merchantOverrides, categoryOverrides])

  const paginated  = filtered.slice((page - 1) * pageSize, page * pageSize)
  const totalPages = Math.ceil(filtered.length / pageSize)

  const handleSubmit = () => {
    if (!form.amount || isNaN(Number(form.amount))) {
      setSubmitError('Please enter a valid amount.')
      return
    }
    setSubmitError(null)
    addManualTx.mutate(
      {
        merchantName: form.merchantName,
        amount: Number(form.amount),
        type: form.type,
        category: form.category,
        date: form.date,
        accountId: form.accountId,
      },
      {
        onSuccess: () => {
          setModalOpen(false)
          setForm({ merchantName: '', amount: '', type: 'expense', category: TX_CATEGORIES[1], date: new Date().toISOString().slice(0, 10), accountId: 'cash' })
        },
        onError: err => setSubmitError(err instanceof Error ? err.message : 'Something went wrong.'),
      },
    )
  }
  const submitting = addManualTx.isPending

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px' }}>
        <p style={{ fontFamily: fonts.mono, fontSize: '14px', color: colors.textMuted, letterSpacing: '0.06em' }}>
          Loading...
        </p>
      </div>
    )
  }

  const prevDisabled = page === 1
  const nextDisabled = page === totalPages || totalPages === 0

  const pageBtnStyle = (disabled: boolean) => ({
    minHeight: spacing.tapTarget,
    padding: '0 20px',
    backgroundColor: disabled ? colors.surfaceAlt : colors.gold,
    border: `1px solid ${colors.goldBorder}`,
    borderRadius: radius.badge,
    color: disabled ? colors.textMuted : colors.text,
    fontFamily: fonts.mono,
    fontSize: '12px',
    letterSpacing: '0.08em',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
  } as const)

  return (
    <>
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: spacing.sectionGap,
        paddingBottom: 80,
      }}
    >
      {/* Search input */}
      <input
        type="text"
        placeholder="Search merchant..."
        value={search}
        onChange={e => { setSearch(e.target.value); setPage(1) }}
        style={{
          width: '100%',
          padding: '12px',
          backgroundColor: colors.surfaceAlt,
          border: `1px solid ${colors.goldBorder}`,
          borderRadius: radius.badge,
          color: colors.text,
          fontFamily: fonts.mono,
          fontSize: '14px',
          outline: 'none',
          boxSizing: 'border-box',
        }}
      />

      {/* Category filter chips */}
      {/* RN: use FlatList horizontal */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          overflowX: 'auto',
          gap: spacing.tightGap,
          paddingBottom: 4,
        }}
      >
        {CATEGORIES.map(cat => {
          const active = category === cat
          return (
            <button
              key={cat}
              onClick={() => { setCategory(cat); setPage(1) }}
              style={{
                height: 36,
                borderRadius: radius.badge,
                padding: '0 12px',
                fontFamily: fonts.mono,
                fontSize: 12,
                letterSpacing: '0.06em',
                border: `1px solid ${active ? colors.gold : colors.border}`,
                backgroundColor: active ? colors.goldSubtle : 'transparent',
                color: active ? colors.gold : colors.textMuted,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              {cat}
            </button>
          )
        })}
      </div>

      {/* Needs-labeling toggle + per-page */}
      <div style={{ display: 'flex', alignItems: 'center', gap: spacing.tightGap, flexWrap: 'wrap' }}>
        <button
          onClick={() => { setNeedsLabelingOnly(v => !v); setPage(1) }}
          disabled={needsLabelingCount === 0 && !needsLabelingOnly}
          style={{
            height: 36,
            borderRadius: radius.badge,
            padding: '0 12px',
            fontFamily: fonts.mono,
            fontSize: 12,
            letterSpacing: '0.06em',
            border: `1px solid ${needsLabelingOnly ? colors.gold : colors.border}`,
            backgroundColor: needsLabelingOnly ? colors.goldSubtle : 'transparent',
            color: needsLabelingOnly ? colors.gold : colors.textMuted,
            cursor: needsLabelingCount === 0 && !needsLabelingOnly ? 'not-allowed' : 'pointer',
            opacity: needsLabelingCount === 0 && !needsLabelingOnly ? 0.5 : 1,
            whiteSpace: 'nowrap',
          }}
        >
          Needs labeling{needsLabelingCount > 0 ? ` (${needsLabelingCount})` : ''}
        </button>
        <select
          value={pageSize}
          onChange={e => { setPageSize(Number(e.target.value)); setPage(1) }}
          aria-label="Transactions per page"
          style={{
            height: 36,
            borderRadius: radius.badge,
            padding: '0 12px',
            fontFamily: fonts.mono,
            fontSize: 12,
            letterSpacing: '0.06em',
            border: `1px solid ${colors.border}`,
            backgroundColor: 'transparent',
            color: colors.textMuted,
            cursor: 'pointer',
          }}
        >
          {[25, 50, 100].map(n => <option key={n} value={n}>{n} / page</option>)}
        </select>
        <span style={{ fontFamily: fonts.mono, fontSize: 12, color: colors.textMuted, marginLeft: 'auto' }}>
          {filtered.length} transactions
        </span>
      </div>

      {/* Transaction list */}
      {transactions.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '40px 0', textAlign: 'center' }}>
          <p style={{ fontFamily: fonts.mono, fontSize: '16px', color: colors.text, margin: 0 }}>No transactions yet</p>
          <p style={{ fontFamily: fonts.mono, fontSize: '13px', color: colors.textMuted, margin: 0, lineHeight: 1.6 }}>
            Connect a bank account or add a transaction manually.
          </p>
          <Link
            href="/dashboard/accounts"
            style={{
              padding: '12px 24px',
              backgroundColor: colors.gold,
              border: 'none',
              borderRadius: radius.badge,
              color: colors.text,
              fontFamily: fonts.mono,
              fontSize: '13px',
              letterSpacing: '0.08em',
              textDecoration: 'none',
              display: 'inline-block',
              minHeight: spacing.tapTarget,
            }}
          >
            Connect an Account
          </Link>
        </div>
      ) : paginated.length === 0 ? (
        <p style={{ fontFamily: fonts.mono, fontSize: '14px', color: colors.textMuted, textAlign: 'center', padding: '32px 0' }}>
          No transactions match your filters
        </p>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={`${category}-${search}-${needsLabelingOnly}-${pageSize}-${page}`}
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.025 } } }}
            style={{ display: 'flex', flexDirection: 'column', width: '100%' }}
          >
            {paginated.map(tx => {
              const acct = accountMap[tx.accountId]
              const displayMerchant = merchantOverrides[tx.id] ?? tx.merchantName
              const displayCategory = categoryOverrides[tx.id] ?? tx.category
              return (
                <TransactionRow
                  key={tx.id}
                  id={tx.id}
                  merchantName={displayMerchant}
                  amount={tx.amount}
                  category={displayCategory}
                  date={tx.date}
                  pending={tx.pending}
                  accountName={acct?.institutionName ?? null}
                  last4={acct?.last4 ?? null}
                  recurring={tx.merchantName ? recurringMerchants.has(tx.merchantName) : false}
                  tags={tagOverrides[tx.id] ?? (tx as { tags?: string[] }).tags ?? []}
                  needsLabeling={isMaskedMerchant(displayMerchant) || displayCategory === 'Other'}
                  editingRowId={editingRowId}
                  onEditRow={setEditingRowId}
                  onSave={handleMobileInlineSave}
                  onCategoryChange={handleMobileCategoryChange}
                  onTagsChange={handleMobileTagsChange}
                />
              )
            })}
          </motion.div>
        </AnimatePresence>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 16 }}>
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={prevDisabled}
            style={pageBtnStyle(prevDisabled)}
          >
            PREV
          </button>
          <span style={{ fontFamily: fonts.mono, fontSize: 12, color: colors.textMuted }}>
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={nextDisabled}
            style={pageBtnStyle(nextDisabled)}
          >
            NEXT
          </button>
        </div>
      )}

      {/* FAB for adding a transaction */}
      {/* RN: use position absolute with SafeAreaView insets */}
      <button
        onClick={() => setModalOpen(true)}
        style={{
          alignSelf: 'flex-end',
          marginTop: 'auto',
          width: 56,
          height: 56,
          backgroundColor: colors.gold,
          border: 'none',
          borderRadius: 28,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          fontSize: 24,
          color: colors.text,
          fontFamily: fonts.mono,
        }}
        aria-label="Add transaction"
      >
        +
      </button>
    </motion.div>

    <AddTransactionModal
      modalOpen={modalOpen}
      setModalOpen={setModalOpen}
      form={form}
      setForm={setForm}
      submitting={submitting}
      submitError={submitError}
      handleSubmit={handleSubmit}
      accounts={accounts}
    />

    <AnimatePresence>
      {toast && (
        <motion.div
          key="labeling-toast-mobile"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.2 }}
          style={{
            position: 'fixed',
            bottom: '100px',
            left: '16px',
            right: '16px',
            zIndex: 60,
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-info-border)',
            borderRadius: '2px',
            padding: '12px 16px',
            fontFamily: 'var(--font-mono)',
            fontSize: '13px',
            color: 'var(--color-text)',
            letterSpacing: '0.04em',
            textAlign: 'center',
            boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
          }}
        >
          {toast}
        </motion.div>
      )}
    </AnimatePresence>
    </>
  )
}

export default function TransactionsPage() {
  const isMobile = useIsMobile()
  return isMobile ? <TransactionsMobile /> : <TransactionsDesktop />
}
