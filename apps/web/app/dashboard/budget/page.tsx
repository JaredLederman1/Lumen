'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import DataTooltip from '@/components/ui/DataTooltip'
import { useDashboard } from '@/lib/dashboardData'
import { BUDGET_CATEGORIES } from '@/lib/categories'
import { useIsMobile } from '@/hooks/useIsMobile'
import MobileCard from '@/components/ui/MobileCard'
import { colors, fonts, spacing, radius } from '@/lib/theme'

// Types

type CategoryType = 'need' | 'want' | 'saving' | 'debt'

interface EditRow {
  _id: string
  name: string
  amount: number
  type: CategoryType
}

interface BudgetData {
  strategy: string
  monthlyIncome: number
  categories: Array<{ name: string; amount: number; type: CategoryType }>
}

interface ActualEntry {
  category: string
  total: number
}

type Phase = 'idle' | 'streaming' | 'reviewing' | 'editing'

// Helpers

let _idCounter = 0
const nextId = () => String(++_idCounter)

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', maximumFractionDigits: 0,
  }).format(n)
}

function toRows(cats: BudgetData['categories']): EditRow[] {
  return cats.map(c => ({ _id: nextId(), name: c.name, amount: c.amount, type: c.type }))
}

// Styles

const card = {
  backgroundColor: 'var(--color-surface)',
  border: '1px solid var(--color-gold-border)',
  borderRadius: '2px',
  padding: '28px',
} as const

const labelStyle = {
  fontFamily: 'var(--font-mono)',
  fontSize: '12px',
  color: 'var(--color-text-muted)',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.16em',
} as const

const typeMeta: Record<CategoryType, { color: string; bg: string; label: string }> = {
  need:   { color: 'var(--color-text-muted)', bg: 'rgba(255,255,255,0.04)', label: 'Need' },
  want:   { color: 'var(--color-info)',        bg: 'var(--color-info-bg)',   label: 'Want' },
  saving: { color: 'var(--color-positive)',    bg: 'var(--color-positive-bg)', label: 'Saving' },
  debt:   { color: 'var(--color-negative)',    bg: 'var(--color-negative-bg)', label: 'Debt' },
}

// Validation alerts

interface Alert { level: 'error' | 'warning' | 'info'; message: string }

function computeAlerts(rows: EditRow[], income: number): Alert[] {
  const alerts: Alert[] = []
  const total = rows.reduce((s, r) => s + (r.amount || 0), 0)
  const gap = income - total
  const savingTotal = rows.filter(r => r.type === 'saving').reduce((s, r) => s + r.amount, 0)
  const debtTotal = rows.filter(r => r.type === 'debt').reduce((s, r) => s + r.amount, 0)
  const hasSavingRow = rows.some(r => r.type === 'saving')
  const hasDebtRow = rows.some(r => r.type === 'debt')

  if (Math.abs(gap) > 0.5) {
    if (gap > 0) {
      alerts.push({ level: 'warning', message: `${fmt(gap)} is unallocated. Assign it to a category to balance your budget.` })
    } else {
      alerts.push({ level: 'error', message: `Over budget by ${fmt(Math.abs(gap))}. Reduce category amounts to balance.` })
    }
  }

  if (!hasSavingRow) {
    alerts.push({ level: 'error', message: 'No savings category. Add at least one savings allocation to build long-term wealth.' })
  } else if (income > 0 && savingTotal / income < 0.10) {
    alerts.push({ level: 'warning', message: `Savings is ${((savingTotal / income) * 100).toFixed(0)}% of income. A minimum of 10% is recommended.` })
  }
  if (hasDebtRow && income > 0 && debtTotal / income < 0.03) {
    alerts.push({ level: 'info', message: 'Debt payments are under 3% of income. If you carry high-interest debt, allocating more accelerates payoff significantly.' })
  }
  return alerts
}

// Overspend alerts (vs actuals)

function computeOverspendAlerts(
  rows: EditRow[],
  actuals: ActualEntry[],
  rolloverMap: Record<string, number>,
): Alert[] {
  const alerts: Alert[] = []
  const actualMap: Record<string, number> = {}
  for (const a of actuals) {
    actualMap[a.category.toLowerCase()] = a.total
  }

  for (const row of rows) {
    const spent = actualMap[row.name.toLowerCase()] ?? 0
    const rollover = rolloverMap[row.name] ?? 0
    const effectiveBudget = row.amount + rollover
    if (spent <= 0 || effectiveBudget <= 0) continue

    const pct = spent / effectiveBudget

    if (spent > effectiveBudget) {
      alerts.push({
        level: 'error',
        message: `${row.name}: over budget by ${fmt(spent - effectiveBudget)} this month (${fmt(spent)} spent vs ${fmt(effectiveBudget)} budgeted${rollover > 0 ? ` incl. ${fmt(rollover)} rollover` : ''}).`,
      })
    } else if (pct >= 0.85) {
      alerts.push({
        level: 'warning',
        message: `${row.name}: ${Math.round(pct * 100)}% used with ${new Date().toLocaleDateString('en-US', { month: 'long' })} not yet complete (${fmt(spent)} of ${fmt(effectiveBudget)}).`,
      })
    }
  }
  return alerts
}

const alertColors = {
  error:   { bg: 'var(--color-negative-bg)',  border: 'var(--color-negative-border)', text: 'var(--color-negative)' },
  warning: { bg: 'rgba(184,145,58,0.08)',      border: 'rgba(184,145,58,0.25)',         text: 'var(--color-gold)' },
  info:    { bg: 'var(--color-info-bg)',        border: 'var(--color-info-border)',      text: 'var(--color-info)' },
}

// Sub-components

function InputField({
  value, onChange, placeholder, type = 'text', style = {},
}: {
  value: string | number
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  style?: React.CSSProperties
}) {
  const [focused, setFocused] = useState(false)
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        backgroundColor: 'rgba(255,255,255,0.04)',
        border: `1px solid ${focused ? 'var(--color-gold)' : 'var(--color-border)'}`,
        borderRadius: '2px',
        color: 'var(--color-text)',
        fontFamily: type === 'number' ? 'var(--font-sans)' : 'var(--font-mono)',
        fontSize: '13px',
        padding: '6px 10px',
        outline: 'none',
        transition: 'border-color 120ms ease',
        ...style,
      }}
    />
  )
}

function TypeSelect({ value, onChange }: { value: CategoryType; onChange: (v: CategoryType) => void }) {
  const [focused, setFocused] = useState(false)
  const meta = typeMeta[value]
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value as CategoryType)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        backgroundColor: meta.bg,
        border: `1px solid ${focused ? 'var(--color-gold)' : 'var(--color-border)'}`,
        borderRadius: '2px',
        color: meta.color,
        fontFamily: 'var(--font-mono)',
        fontSize: '11px',
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        padding: '5px 8px',
        outline: 'none',
        cursor: 'pointer',
        transition: 'border-color 120ms ease',
        width: '90px',
      }}
    >
      {(Object.keys(typeMeta) as CategoryType[]).map(t => (
        <option key={t} value={t} style={{ backgroundColor: 'var(--color-surface)', color: 'var(--color-text)', textTransform: 'uppercase' }}>
          {typeMeta[t].label}
        </option>
      ))}
    </select>
  )
}

// Progress bar row

function CategoryProgressRow({
  row,
  spent,
  rollover,
}: {
  row: EditRow
  spent: number
  rollover: number
}) {
  const effectiveBudget = row.amount + rollover
  const pct = effectiveBudget > 0 ? Math.min(spent / effectiveBudget, 1) : 0
  const isOver = spent > effectiveBudget
  const meta = typeMeta[row.type]

  const barColor = isOver
    ? 'var(--color-negative)'
    : pct >= 0.85
    ? 'var(--color-gold)'
    : 'var(--color-positive)'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '12px 0', borderBottom: '1px solid var(--color-border)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontFamily: 'var(--font-serif)', fontSize: '14px', color: 'var(--color-text)' }}>
            {row.name}
          </span>
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: '10px', textTransform: 'uppercase',
            letterSpacing: '0.08em', padding: '2px 6px', borderRadius: '2px',
            color: meta.color, backgroundColor: meta.bg,
          }}>
            {row.type}
          </span>
          {rollover > 0 && (
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: '10px',
              color: 'var(--color-positive)', letterSpacing: '0.04em',
            }}>
              +{fmt(rollover)} rollover
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
          <span style={{
            fontFamily: 'var(--font-sans)', fontSize: '14px',
            color: isOver ? 'var(--color-negative)' : 'var(--color-text)',
          }}>
            {fmt(spent)}
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--color-text-muted)' }}>
            / {fmt(effectiveBudget)}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{
        height: '3px',
        backgroundColor: 'var(--color-grid-line)',
        borderRadius: '2px',
        overflow: 'hidden',
      }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct * 100}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          style={{ height: '100%', backgroundColor: barColor, borderRadius: '2px' }}
        />
      </div>

      {/* Remaining / over label */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: '10px',
          color: isOver ? 'var(--color-negative)' : 'var(--color-text-muted)',
        }}>
          {isOver ? `${fmt(spent - effectiveBudget)} over` : `${fmt(effectiveBudget - spent)} remaining`}
        </span>
      </div>
    </div>
  )
}

// Budget Editor (desktop)

function BudgetEditor({
  strategy,
  initialIncome,
  initialRows,
  onReanalyze,
  authToken,
}: {
  strategy: string
  initialIncome: number
  initialRows: EditRow[]
  onReanalyze: () => void
  authToken: string | null
}) {
  const [rows, setRows] = useState<EditRow[]>(initialRows)
  const [monthlyIncome, setMonthlyIncome] = useState(initialIncome)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [actuals, setActuals] = useState<ActualEntry[]>([])
  const [rolloverMap, setRolloverMap] = useState<Record<string, number>>({})
  const [view, setView] = useState<'edit' | 'actuals'>('actuals')
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const budgetAlerts = computeAlerts(rows, monthlyIncome)
  const overspendAlerts = computeOverspendAlerts(rows, actuals, rolloverMap)
  const allAlerts = view === 'edit' ? budgetAlerts : overspendAlerts

  const total = rows.reduce((s, r) => s + (r.amount || 0), 0)
  const remaining = monthlyIncome - total
  const isBalanced = Math.abs(remaining) < 1

  // Load actuals + rollovers on mount
  useEffect(() => {
    const headers: Record<string, string> = authToken ? { Authorization: `Bearer ${authToken}` } : {}
    fetch('/api/budget/actuals', { headers })
      .then(r => r.json())
      .then(d => {
        if (d.actuals) setActuals(d.actuals)
        if (d.rolloverMap) setRolloverMap(d.rolloverMap)
      })
      .catch(() => {})
  }, [authToken])

  function updateRow(id: string, field: keyof EditRow, value: string | number | CategoryType) {
    setRows(prev => prev.map(r => r._id === id ? { ...r, [field]: value } : r))
    setSaveStatus('idle')
  }

  function deleteRow(id: string) {
    setRows(prev => prev.filter(r => r._id !== id))
    setSaveStatus('idle')
  }

  function addRow() {
    setRows(prev => {
      const usedNames = new Set(prev.map(r => r.name))
      const nextName = BUDGET_CATEGORIES.find(c => !usedNames.has(c)) ?? ''
      return [...prev, { _id: nextId(), name: nextName, amount: 0, type: 'need' }]
    })
    setSaveStatus('idle')
  }

  async function saveChanges() {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    setSaveStatus('saving')
    try {
      const authHeaders: Record<string, string> = authToken ? { Authorization: `Bearer ${authToken}` } : {}
      const res = await fetch('/api/budget', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          strategy,
          monthlyIncome,
          categories: rows.map(({ name, amount, type }) => ({ name, amount, type })),
        }),
      })
      if (res.ok) {
        setSaveStatus('saved')
        saveTimerRef.current = setTimeout(() => setSaveStatus('idle'), 3000)
      } else {
        setSaveStatus('idle')
      }
    } catch {
      setSaveStatus('idle')
    }
  }

  const actualMap: Record<string, number> = {}
  for (const a of actuals) {
    actualMap[a.category.toLowerCase()] = a.total
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <p style={{ fontFamily: 'var(--font-serif)', fontSize: '24px', fontWeight: 400, color: 'var(--color-text)' }}>
            Your Budget
          </p>
          <span style={{
            ...labelStyle,
            color: 'var(--color-gold)',
            backgroundColor: 'var(--color-gold-subtle)',
            border: '1px solid var(--color-gold-border)',
            padding: '3px 10px',
            borderRadius: '2px',
            letterSpacing: '0.08em',
          }}>
            {strategy}
          </span>
        </div>
        <button
          onClick={onReanalyze}
          style={{
            padding: '7px 14px',
            backgroundColor: 'transparent',
            border: '1px solid var(--color-border)',
            borderRadius: '2px',
            color: 'var(--color-text-muted)',
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            letterSpacing: '0.06em',
            cursor: 'pointer',
          }}
        >
          Re-analyze
        </button>
      </div>

      {/* View toggle */}
      <div style={{ display: 'flex', gap: '2px', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: '2px', padding: '3px', width: 'fit-content' }}>
        {(['actuals', 'edit'] as const).map(v => (
          <button
            key={v}
            onClick={() => setView(v)}
            style={{
              padding: '6px 16px',
              backgroundColor: view === v ? 'var(--color-surface)' : 'transparent',
              border: view === v ? '1px solid var(--color-gold-border)' : '1px solid transparent',
              borderRadius: '2px',
              color: view === v ? 'var(--color-text)' : 'var(--color-text-muted)',
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              transition: 'all 120ms ease',
            }}
          >
            {v === 'actuals' ? 'Month-to-Date' : 'Edit Budget'}
          </button>
        ))}
      </div>

      {/* Alerts */}
      <AnimatePresence>
        {allAlerts.map((alert, i) => {
          const c = alertColors[alert.level]
          return (
            <motion.div
              key={alert.message}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2, delay: i * 0.04 }}
              style={{
                backgroundColor: c.bg,
                border: `1px solid ${c.border}`,
                borderRadius: '2px',
                padding: '11px 16px',
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
                color: c.text,
                lineHeight: 1.6,
              }}
            >
              {alert.message}
            </motion.div>
          )
        })}
      </AnimatePresence>

      {/* Month-to-Date view */}
      {view === 'actuals' && (
        <motion.div
          key="actuals-view"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.25 }}
          style={card}
        >
          <p style={{ ...labelStyle, marginBottom: '20px' }}>
            {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </p>

          {actuals.length === 0 ? (
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--color-text-muted)', lineHeight: 1.8 }}>
              No transaction data for this month yet. Connect accounts via Plaid to see actuals.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {rows.map(row => {
                const spent = actualMap[row.name.toLowerCase()] ?? 0
                const rollover = rolloverMap[row.name] ?? 0
                return (
                  <CategoryProgressRow
                    key={row._id}
                    row={row}
                    spent={spent}
                    rollover={rollover}
                  />
                )
              })}
            </div>
          )}

          {/* Total row */}
          {(() => {
            const budgetedNames = new Set(rows.map(r => r.name.toLowerCase()))
            const trackedSpent = actuals
              .filter(a => budgetedNames.has(a.category.toLowerCase()))
              .reduce((s, a) => s + a.total, 0)
            const untrackedActuals = actuals
              .filter(a => !budgetedNames.has(a.category.toLowerCase()))
            const untrackedSpent = untrackedActuals.reduce((s, a) => s + a.total, 0)

            const trackedSources = rows
              .map(r => {
                const spent = actualMap[r.name.toLowerCase()] ?? 0
                return { label: r.name, value: spent, type: 'computed' as const }
              })
              .filter(s => s.value > 0)

            const untrackedSources = untrackedActuals
              .map(a => ({ label: a.category, value: a.total, type: 'computed' as const }))

            return (
              <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <p style={{ ...labelStyle, marginBottom: 0, fontSize: '10px' }}>Budgeted spending</p>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                    <span style={{ fontFamily: 'var(--font-sans)', fontSize: '18px', color: 'var(--color-text)' }}>
                      <DataTooltip
                        value={trackedSpent}
                        title="Budgeted Spending"
                        computationNote="Sum of this month's spending in your budgeted categories"
                        sources={trackedSources}
                        accentColor="var(--color-text)"
                      />
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--color-text-muted)' }}>
                      / {fmt(total)}
                    </span>
                  </div>
                </div>
                {untrackedSpent > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <p style={{ ...labelStyle, marginBottom: 0, fontSize: '10px', color: 'var(--color-text-muted)' }}>Unbudgeted spending</p>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--color-text-muted)' }}>
                      <DataTooltip
                        value={untrackedSpent}
                        title="Unbudgeted Spending"
                        computationNote="Spending in categories without a budget row"
                        sources={untrackedSources}
                        accentColor="var(--color-text-muted)"
                      />
                    </span>
                  </div>
                )}
              </div>
            )
          })()}
        </motion.div>
      )}

      {/* Edit budget view */}
      {view === 'edit' && (
        <motion.div
          key="edit-view"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.25 }}
          style={card}
        >
          {/* Monthly income row */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            paddingBottom: '18px', marginBottom: '18px',
            borderBottom: '1px solid var(--color-border)',
          }}>
            <p style={{ ...labelStyle, marginBottom: 0 }}>Monthly Take-Home</p>
            <InputField
              type="number"
              value={monthlyIncome}
              onChange={v => { setMonthlyIncome(parseFloat(v) || 0); setSaveStatus('idle') }}
              style={{ width: '130px', textAlign: 'right', fontSize: '15px' }}
            />
          </div>

          {/* Column headers */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 100px 120px 32px',
            gap: '10px',
            paddingBottom: '10px',
            marginBottom: '4px',
          }}>
            {['Category', 'Type', 'Amount', ''].map(h => (
              <p key={h} style={{ ...labelStyle, marginBottom: 0, fontSize: '10px' }}>{h}</p>
            ))}
          </div>

          {/* Editable rows */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <AnimatePresence initial={false}>
              {rows.map(row => (
                <motion.div
                  key={row._id}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.18, ease: 'easeInOut' }}
                  style={{ overflow: 'hidden' }}
                >
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 100px 120px 32px',
                    gap: '10px',
                    alignItems: 'center',
                  }}>
                    <select
                      value={row.name}
                      onChange={e => updateRow(row._id, 'name', e.target.value)}
                      style={{
                        width: '100%',
                        backgroundColor: 'rgba(255,255,255,0.04)',
                        border: '1px solid var(--color-border)',
                        borderRadius: '2px',
                        color: 'var(--color-text)',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '13px',
                        padding: '6px 10px',
                        outline: 'none',
                        cursor: 'pointer',
                        transition: 'border-color 120ms ease',
                      }}
                      onFocus={e => { e.currentTarget.style.borderColor = 'var(--color-gold)' }}
                      onBlur={e => { e.currentTarget.style.borderColor = 'var(--color-border)' }}
                    >
                      {row.name && !BUDGET_CATEGORIES.includes(row.name as typeof BUDGET_CATEGORIES[number]) && (
                        <option value={row.name}>{row.name}</option>
                      )}
                      {BUDGET_CATEGORIES.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    <TypeSelect value={row.type} onChange={v => updateRow(row._id, 'type', v)} />
                    <InputField
                      type="number"
                      value={row.amount || ''}
                      onChange={v => updateRow(row._id, 'amount', parseFloat(v) || 0)}
                      placeholder="0"
                      style={{ width: '100%', textAlign: 'right' }}
                    />
                    <button
                      onClick={() => deleteRow(row._id)}
                      title="Remove category"
                      style={{
                        width: '28px', height: '28px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        backgroundColor: 'transparent',
                        border: '1px solid transparent',
                        borderRadius: '2px',
                        color: 'var(--color-text-muted)',
                        fontSize: '14px',
                        cursor: 'pointer',
                        flexShrink: 0,
                        transition: 'color 120ms, border-color 120ms',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.color = 'var(--color-negative)'
                        e.currentTarget.style.borderColor = 'var(--color-negative-border)'
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.color = 'var(--color-text-muted)'
                        e.currentTarget.style.borderColor = 'transparent'
                      }}
                    >
                      x
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Add category */}
          <button
            onClick={addRow}
            style={{
              marginTop: '14px',
              padding: '8px 14px',
              backgroundColor: 'transparent',
              border: '1px dashed var(--color-border)',
              borderRadius: '2px',
              color: 'var(--color-text-muted)',
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              letterSpacing: '0.08em',
              cursor: 'pointer',
              width: '100%',
              textAlign: 'center',
              transition: 'border-color 120ms, color 120ms',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'var(--color-gold)'
              e.currentTarget.style.color = 'var(--color-gold)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'var(--color-border)'
              e.currentTarget.style.color = 'var(--color-text-muted)'
            }}
          >
            + Add Category
          </button>

          {/* Totals row */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginTop: '18px', paddingTop: '16px',
            borderTop: '1px solid var(--color-border)',
          }}>
            <p style={{ ...labelStyle, marginBottom: 0, fontSize: '10px' }}>
              {isBalanced ? 'Fully allocated' : remaining > 0 ? `${fmt(remaining)} remaining` : `${fmt(Math.abs(remaining))} over`}
            </p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
              <span style={{
                fontFamily: 'var(--font-sans)',
                fontSize: '20px',
                fontWeight: 500,
                color: isBalanced ? 'var(--color-positive)' : remaining > 0 ? 'var(--color-gold)' : 'var(--color-negative)',
              }}>
                {fmt(total)}
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--color-text-muted)' }}>
                / {fmt(monthlyIncome)}
              </span>
            </div>
          </div>
        </motion.div>
      )}

      {/* Save button, only in edit view */}
      {view === 'edit' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={saveChanges}
            disabled={saveStatus === 'saving'}
            style={{
              padding: '12px 28px',
              backgroundColor: saveStatus === 'saving' ? 'var(--color-gold-subtle)' : 'var(--color-gold)',
              border: 'none',
              borderRadius: '2px',
              color: saveStatus === 'saving' ? 'var(--color-gold)' : 'var(--color-bg)',
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              cursor: saveStatus === 'saving' ? 'not-allowed' : 'pointer',
              transition: 'all 150ms ease',
            }}
          >
            {saveStatus === 'saving' ? 'Saving...' : 'Save Changes'}
          </button>
          <AnimatePresence>
            {saveStatus === 'saved' && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--color-positive)' }}
              >
                Changes saved
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  )
}

// Budget Editor Mobile

function BudgetEditorMobile({
  strategy,
  initialIncome,
  initialRows,
  onReanalyze,
  authToken,
}: {
  strategy: string
  initialIncome: number
  initialRows: EditRow[]
  onReanalyze: () => void
  authToken: string | null
}) {
  const [rows, setRows] = useState<EditRow[]>(initialRows)
  const [monthlyIncome, setMonthlyIncome] = useState(initialIncome)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [actuals, setActuals] = useState<ActualEntry[]>([])
  const [rolloverMap, setRolloverMap] = useState<Record<string, number>>({})
  const [view, setView] = useState<'edit' | 'actuals'>('actuals')
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const budgetAlerts = computeAlerts(rows, monthlyIncome)
  const overspendAlerts = computeOverspendAlerts(rows, actuals, rolloverMap)
  const allAlerts = view === 'edit' ? budgetAlerts : overspendAlerts

  const total = rows.reduce((s, r) => s + (r.amount || 0), 0)
  const remaining = monthlyIncome - total
  const isBalanced = Math.abs(remaining) < 1

  useEffect(() => {
    const headers: Record<string, string> = authToken ? { Authorization: `Bearer ${authToken}` } : {}
    fetch('/api/budget/actuals', { headers })
      .then(r => r.json())
      .then(d => {
        if (d.actuals) setActuals(d.actuals)
        if (d.rolloverMap) setRolloverMap(d.rolloverMap)
      })
      .catch(() => {})
  }, [authToken])

  function updateRow(id: string, field: keyof EditRow, value: string | number | CategoryType) {
    setRows(prev => prev.map(r => r._id === id ? { ...r, [field]: value } : r))
    setSaveStatus('idle')
  }

  function deleteRow(id: string) {
    setRows(prev => prev.filter(r => r._id !== id))
    setSaveStatus('idle')
  }

  function addRow() {
    setRows(prev => {
      const usedNames = new Set(prev.map(r => r.name))
      const nextName = BUDGET_CATEGORIES.find(c => !usedNames.has(c)) ?? ''
      return [...prev, { _id: nextId(), name: nextName, amount: 0, type: 'need' }]
    })
    setSaveStatus('idle')
  }

  async function saveChanges() {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    setSaveStatus('saving')
    try {
      const authHeaders: Record<string, string> = authToken ? { Authorization: `Bearer ${authToken}` } : {}
      const res = await fetch('/api/budget', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          strategy,
          monthlyIncome,
          categories: rows.map(({ name, amount, type }) => ({ name, amount, type })),
        }),
      })
      if (res.ok) {
        setSaveStatus('saved')
        saveTimerRef.current = setTimeout(() => setSaveStatus('idle'), 3000)
      } else {
        setSaveStatus('idle')
      }
    } catch {
      setSaveStatus('idle')
    }
  }

  const actualMap: Record<string, number> = {}
  for (const a of actuals) {
    actualMap[a.category.toLowerCase()] = a.total
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      style={{ display: 'flex', flexDirection: 'column', gap: spacing.sectionGap }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: spacing.tightGap }}>
        <span style={{
          fontFamily: fonts.mono,
          fontSize: 11,
          color: colors.gold,
          backgroundColor: colors.goldSubtle,
          border: `1px solid ${colors.goldBorder}`,
          padding: '3px 10px',
          borderRadius: radius.badge,
          textTransform: 'uppercase' as const,
          letterSpacing: '0.08em',
        }}>
          {strategy}
        </span>
        <button
          onClick={onReanalyze}
          style={{
            minHeight: spacing.tapTarget,
            padding: '0 16px',
            backgroundColor: 'transparent',
            border: `1px solid ${colors.border}`,
            borderRadius: radius.button,
            color: colors.textMuted,
            fontFamily: fonts.mono,
            fontSize: 11,
            letterSpacing: '0.06em',
            cursor: 'pointer',
          }}
        >
          Re-analyze
        </button>
      </div>

      {/* View toggle */}
      <div style={{ display: 'flex', gap: 2, backgroundColor: colors.surfaceAlt, borderRadius: radius.card, padding: 3 }}>
        {(['actuals', 'edit'] as const).map(v => (
          <button
            key={v}
            onClick={() => setView(v)}
            style={{
              flex: 1,
              minHeight: spacing.tapTarget,
              backgroundColor: view === v ? colors.surface : 'transparent',
              border: view === v ? `1px solid ${colors.goldBorder}` : '1px solid transparent',
              borderRadius: radius.button,
              color: view === v ? colors.text : colors.textMuted,
              fontFamily: fonts.mono,
              fontSize: 11,
              letterSpacing: '0.08em',
              textTransform: 'uppercase' as const,
              cursor: 'pointer',
            }}
          >
            {v === 'actuals' ? 'Month-to-Date' : 'Edit Budget'}
          </button>
        ))}
      </div>

      {/* Alerts */}
      <AnimatePresence>
        {allAlerts.map((alert, i) => {
          const c = alertColors[alert.level]
          return (
            <motion.div
              key={alert.message}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2, delay: i * 0.04 }}
              style={{
                backgroundColor: c.bg,
                border: `1px solid ${c.border}`,
                borderRadius: radius.card,
                padding: '12px 16px',
                fontFamily: fonts.mono,
                fontSize: 12,
                color: c.text,
                lineHeight: 1.6,
              }}
            >
              {alert.message}
            </motion.div>
          )
        })}
      </AnimatePresence>

      {/* Month-to-Date view */}
      {view === 'actuals' && (
        <MobileCard>
          <p style={{
            fontFamily: fonts.mono,
            fontSize: 11,
            color: colors.textMuted,
            textTransform: 'uppercase' as const,
            letterSpacing: '0.16em',
            marginBottom: spacing.sectionGap,
          }}>
            {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </p>
          {actuals.length === 0 ? (
            <p style={{ fontFamily: fonts.mono, fontSize: 13, color: colors.textMuted, lineHeight: 1.8 }}>
              No transaction data for this month yet. Connect accounts via Plaid to see actuals.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {rows.map(row => {
                const spent = actualMap[row.name.toLowerCase()] ?? 0
                const rollover = rolloverMap[row.name] ?? 0
                return (
                  <CategoryProgressRow key={row._id} row={row} spent={spent} rollover={rollover} />
                )
              })}
            </div>
          )}
        </MobileCard>
      )}

      {/* Edit budget view */}
      {view === 'edit' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.25 }}
          style={{ display: 'flex', flexDirection: 'column', gap: spacing.sectionGap }}
        >
          {/* Income input */}
          <MobileCard>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: spacing.tapTarget }}>
              <span style={{
                fontFamily: fonts.mono,
                fontSize: 11,
                color: colors.textMuted,
                textTransform: 'uppercase' as const,
                letterSpacing: '0.16em',
              }}>
                Monthly Take-Home
              </span>
              <InputField
                type="number"
                value={monthlyIncome}
                onChange={v => { setMonthlyIncome(parseFloat(v) || 0); setSaveStatus('idle') }}
                style={{ width: '130px', textAlign: 'right', fontSize: '15px' }}
              />
            </div>
          </MobileCard>

          {/* Category rows */}
          <AnimatePresence initial={false}>
            {rows.map(row => (
              <motion.div
                key={row._id}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.18, ease: 'easeInOut' }}
                style={{ overflow: 'hidden' }}
              >
                <MobileCard>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.tightGap }}>
                    {/* Row 1: name selector full width */}
                    <select
                      value={row.name}
                      onChange={e => updateRow(row._id, 'name', e.target.value)}
                      style={{
                        width: '100%',
                        minHeight: spacing.tapTarget,
                        backgroundColor: 'rgba(255,255,255,0.04)',
                        border: `1px solid ${colors.border}`,
                        borderRadius: radius.card,
                        color: colors.text,
                        fontFamily: fonts.mono,
                        fontSize: 13,
                        padding: '0 10px',
                        outline: 'none',
                        cursor: 'pointer',
                      }}
                      onFocus={e => { e.currentTarget.style.borderColor = colors.gold }}
                      onBlur={e => { e.currentTarget.style.borderColor = colors.border }}
                    >
                      {row.name && !BUDGET_CATEGORIES.includes(row.name as typeof BUDGET_CATEGORIES[number]) && (
                        <option value={row.name}>{row.name}</option>
                      )}
                      {BUDGET_CATEGORIES.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    {/* Row 2: type selector, amount input, delete */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: spacing.tightGap }}>
                      <div style={{ flex: 1 }}>
                        <TypeSelect value={row.type} onChange={v => updateRow(row._id, 'type', v)} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <InputField
                          type="number"
                          value={row.amount || ''}
                          onChange={v => updateRow(row._id, 'amount', parseFloat(v) || 0)}
                          placeholder="0"
                          style={{ width: '100%', textAlign: 'right' }}
                        />
                      </div>
                      <button
                        onClick={() => deleteRow(row._id)}
                        title="Remove category"
                        style={{
                          minWidth: spacing.tapTarget,
                          minHeight: spacing.tapTarget,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: 'transparent',
                          border: `1px solid ${colors.border}`,
                          borderRadius: radius.button,
                          color: colors.textMuted,
                          fontSize: 16,
                          cursor: 'pointer',
                          flexShrink: 0,
                        }}
                      >
                        x
                      </button>
                    </div>
                  </div>
                </MobileCard>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Add category */}
          <button
            onClick={addRow}
            style={{
              minHeight: spacing.tapTarget,
              padding: '0 14px',
              backgroundColor: 'transparent',
              border: `1px dashed ${colors.border}`,
              borderRadius: radius.button,
              color: colors.textMuted,
              fontFamily: fonts.mono,
              fontSize: 11,
              letterSpacing: '0.08em',
              cursor: 'pointer',
              width: '100%',
              textAlign: 'center',
            }}
          >
            + Add Category
          </button>

          {/* Totals row */}
          <MobileCard>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: spacing.tapTarget }}>
              <span style={{
                fontFamily: fonts.mono,
                fontSize: 11,
                color: colors.textMuted,
                textTransform: 'uppercase' as const,
                letterSpacing: '0.12em',
              }}>
                {isBalanced ? 'Fully allocated' : remaining > 0 ? `${fmt(remaining)} remaining` : `${fmt(Math.abs(remaining))} over`}
              </span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                <span style={{
                  fontFamily: fonts.sans,
                  fontSize: 20,
                  fontWeight: 500,
                  color: isBalanced ? colors.positive : remaining > 0 ? colors.gold : colors.negative,
                }}>
                  {fmt(total)}
                </span>
                <span style={{ fontFamily: fonts.mono, fontSize: 11, color: colors.textMuted }}>
                  / {fmt(monthlyIncome)}
                </span>
              </div>
            </div>
          </MobileCard>

          {/* Save button */}
          <button
            onClick={saveChanges}
            disabled={saveStatus === 'saving'}
            style={{
              width: '100%',
              minHeight: spacing.tapTarget,
              backgroundColor: saveStatus === 'saving' ? colors.goldSubtle : colors.gold,
              border: 'none',
              borderRadius: radius.button,
              color: saveStatus === 'saving' ? colors.gold : colors.bg,
              fontFamily: fonts.mono,
              fontSize: 12,
              letterSpacing: '0.08em',
              textTransform: 'uppercase' as const,
              cursor: saveStatus === 'saving' ? 'not-allowed' : 'pointer',
            }}
          >
            {saveStatus === 'saving' ? 'Saving...' : 'Save Changes'}
          </button>

          <AnimatePresence>
            {saveStatus === 'saved' && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{ fontFamily: fonts.mono, fontSize: 12, color: colors.positive, textAlign: 'center' }}
              >
                Changes saved
              </motion.p>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </motion.div>
  )
}

// Page (desktop)

function BudgetDesktop() {
  const { authToken } = useDashboard()
  const [phase, setPhase] = useState<Phase>('idle')
  const [streamText, setStreamText] = useState('')
  const [budgetData, setBudgetData] = useState<BudgetData | null>(null)
  const [loadingExisting, setLoadingExisting] = useState(true)
  const streamRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const headers: Record<string, string> = authToken ? { Authorization: `Bearer ${authToken}` } : {}
    fetch('/api/budget', { headers })
      .then(r => r.json())
      .then(d => {
        if (d.budget) {
          setBudgetData({
            strategy: d.budget.strategy,
            monthlyIncome: d.budget.monthlyIncome,
            categories: d.budget.categories,
          })
          setPhase('editing')
        }
      })
      .catch(() => {})
      .finally(() => setLoadingExisting(false))
  }, [authToken])

  useEffect(() => {
    if (streamRef.current) {
      streamRef.current.scrollTop = streamRef.current.scrollHeight
    }
  }, [streamText])

  async function runAnalysis() {
    setPhase('streaming')
    setStreamText('')
    setBudgetData(null)
    let accumulated = ''

    try {
      const authHeaders: Record<string, string> = authToken ? { Authorization: `Bearer ${authToken}` } : {}
      const res = await fetch('/api/budget/recommend', { method: 'POST', headers: authHeaders })
      if (!res.ok || !res.body) { setPhase('idle'); return }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const lines = decoder.decode(value).split('\n').filter(Boolean)
        for (const line of lines) {
          try {
            const event = JSON.parse(line)
            if (event.type === 'delta') {
              accumulated += event.text
              const markerIdx = accumulated.indexOf('BUDGET_JSON_START')
              setStreamText(markerIdx >= 0 ? accumulated.slice(0, markerIdx).trimEnd() : accumulated)
            } else if (event.type === 'done') {
              const start = accumulated.indexOf('BUDGET_JSON_START')
              const end = accumulated.indexOf('BUDGET_JSON_END')
              if (start >= 0 && end > start) {
                const raw = accumulated.slice(start + 'BUDGET_JSON_START'.length, end).trim()
                try { setBudgetData(JSON.parse(raw)) } catch { /* keep null */ }
              }
              setPhase('reviewing')
            }
          } catch { /* skip */ }
        }
      }
    } catch {
      setPhase('idle')
    }
  }

  async function commitBudget() {
    if (!budgetData) return
    const authHeaders: Record<string, string> = authToken ? { Authorization: `Bearer ${authToken}` } : {}
    await fetch('/api/budget', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify(budgetData),
    })
    setStreamText('')
    setPhase('editing')
  }

  function reanalyze() {
    setPhase('idle')
    setStreamText('')
    setBudgetData(null)
  }

  if (loadingExisting) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '320px' }}>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', color: 'var(--color-text-muted)', letterSpacing: '0.06em' }}>
          Loading...
        </p>
      </div>
    )
  }

  if (phase === 'idle') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        style={{ maxWidth: '560px', margin: '0 auto' }}
      >
        <div style={card}>
          <p style={{ ...labelStyle, marginBottom: '16px' }}>Budget Setup</p>
          <p style={{ fontFamily: 'var(--font-serif)', fontSize: '24px', fontWeight: 400, color: 'var(--color-text)', marginBottom: '14px' }}>
            Let Illumin&apos;s Financial Engine analyze your finances
          </p>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--color-text-muted)', lineHeight: 1.8, marginBottom: '28px' }}>
            Illumin will review your income, spending history, debt, and savings to recommend the budgeting strategy that fits your situation. This takes about 10 seconds.
          </p>
          <button
            onClick={runAnalysis}
            style={{
              width: '100%', padding: '14px',
              backgroundColor: 'var(--color-gold)', border: 'none', borderRadius: '2px',
              color: 'var(--color-bg)', fontFamily: 'var(--font-mono)', fontSize: '12px',
              textTransform: 'uppercase', letterSpacing: '0.1em', cursor: 'pointer',
            }}
          >
            Analyze My Finances
          </button>
        </div>
      </motion.div>
    )
  }

  if (phase === 'streaming') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        style={{ maxWidth: '720px', margin: '0 auto' }}
      >
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <p style={{ ...labelStyle, marginBottom: 0 }}>Analyzing your finances...</p>
            <motion.div
              animate={{ opacity: [1, 0, 1] }}
              transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
              style={{ width: '2px', height: '14px', backgroundColor: 'var(--color-gold)', borderRadius: '1px', flexShrink: 0 }}
            />
          </div>
          <div
            ref={streamRef}
            style={{
              fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--color-text)',
              lineHeight: 1.9, maxHeight: '400px', overflowY: 'auto', whiteSpace: 'pre-wrap',
            }}
          >
            {streamText}
          </div>
        </div>
      </motion.div>
    )
  }

  if (phase === 'reviewing') {
    const preview = budgetData
    const totalAlloc = preview ? preview.categories.reduce((s, c) => s + c.amount, 0) : 0
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '720px', margin: '0 auto' }}>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} style={card}>
          <p style={{ ...labelStyle, marginBottom: '16px' }}>Analysis</p>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--color-text)', lineHeight: 1.9, whiteSpace: 'pre-wrap' }}>
            {streamText}
          </p>
        </motion.div>

        {preview && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.08 }} style={card}>
            <p style={{ ...labelStyle, marginBottom: '16px' }}>Suggested Budget</p>
            <div style={{ marginBottom: '20px' }}>
              <span style={{
                ...labelStyle, marginBottom: 0,
                color: 'var(--color-gold)', backgroundColor: 'var(--color-gold-subtle)',
                border: '1px solid var(--color-gold-border)', padding: '3px 10px', borderRadius: '2px',
              }}>
                {preview.strategy}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {preview.categories.map((cat, i) => {
                const m = typeMeta[cat.type] ?? typeMeta.need
                return (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px 0',
                    borderBottom: i < preview.categories.length - 1 ? '1px solid var(--color-border)' : 'none',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <p style={{ fontFamily: 'var(--font-serif)', fontSize: '14px', color: 'var(--color-text)', minWidth: '140px' }}>
                        {cat.name}
                      </p>
                      <span style={{
                        fontFamily: 'var(--font-mono)', fontSize: '10px', textTransform: 'uppercase',
                        letterSpacing: '0.08em', padding: '2px 6px', borderRadius: '2px',
                        color: m.color, backgroundColor: m.bg,
                      }}>
                        {cat.type}
                      </span>
                    </div>
                    <p style={{ fontFamily: 'var(--font-sans)', fontSize: '15px', color: 'var(--color-text)' }}>
                      {fmt(cat.amount)}
                    </p>
                  </div>
                )
              })}
            </div>
            <div style={{
              display: 'flex', justifyContent: 'flex-end', alignItems: 'baseline', gap: '6px',
              marginTop: '14px', paddingTop: '14px', borderTop: '1px solid var(--color-border)',
            }}>
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: '18px', color: 'var(--color-text)' }}>
                {fmt(totalAlloc)}
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--color-text-muted)' }}>
                / {fmt(preview.monthlyIncome)}
              </span>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button
                onClick={reanalyze}
                style={{
                  padding: '10px 20px', backgroundColor: 'transparent',
                  border: '1px solid var(--color-border)', borderRadius: '2px',
                  color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)',
                  fontSize: '12px', letterSpacing: '0.06em', cursor: 'pointer',
                }}
              >
                Re-analyze
              </button>
              <button
                onClick={commitBudget}
                style={{
                  padding: '10px 24px', backgroundColor: 'var(--color-gold)',
                  border: 'none', borderRadius: '2px', color: 'var(--color-bg)',
                  fontFamily: 'var(--font-mono)', fontSize: '12px',
                  letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer',
                }}
              >
                Set Up Budget
              </button>
            </div>
          </motion.div>
        )}
      </div>
    )
  }

  if (phase === 'editing' && budgetData) {
    return (
      <div style={{ maxWidth: '720px', margin: '0 auto' }}>
        <BudgetEditor
          strategy={budgetData.strategy}
          initialIncome={budgetData.monthlyIncome}
          initialRows={toRows(budgetData.categories)}
          onReanalyze={reanalyze}
          authToken={authToken}
        />
      </div>
    )
  }

  return null
}

// Mobile page

function BudgetMobile() {
  const { authToken } = useDashboard()
  const [phase, setPhase] = useState<Phase>('idle')
  const [streamText, setStreamText] = useState('')
  const [budgetData, setBudgetData] = useState<BudgetData | null>(null)
  const [loadingExisting, setLoadingExisting] = useState(true)

  useEffect(() => {
    const headers: Record<string, string> = authToken ? { Authorization: `Bearer ${authToken}` } : {}
    fetch('/api/budget', { headers })
      .then(r => r.json())
      .then(d => {
        if (d.budget) {
          setBudgetData({
            strategy: d.budget.strategy,
            monthlyIncome: d.budget.monthlyIncome,
            categories: d.budget.categories,
          })
          setPhase('editing')
        }
      })
      .catch(() => {})
      .finally(() => setLoadingExisting(false))
  }, [authToken])

  async function runAnalysis() {
    setPhase('streaming')
    setStreamText('')
    setBudgetData(null)
    let accumulated = ''

    try {
      const authHeaders: Record<string, string> = authToken ? { Authorization: `Bearer ${authToken}` } : {}
      const res = await fetch('/api/budget/recommend', { method: 'POST', headers: authHeaders })
      if (!res.ok || !res.body) { setPhase('idle'); return }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const lines = decoder.decode(value).split('\n').filter(Boolean)
        for (const line of lines) {
          try {
            const event = JSON.parse(line)
            if (event.type === 'delta') {
              accumulated += event.text
              const markerIdx = accumulated.indexOf('BUDGET_JSON_START')
              setStreamText(markerIdx >= 0 ? accumulated.slice(0, markerIdx).trimEnd() : accumulated)
            } else if (event.type === 'done') {
              const start = accumulated.indexOf('BUDGET_JSON_START')
              const end = accumulated.indexOf('BUDGET_JSON_END')
              if (start >= 0 && end > start) {
                const raw = accumulated.slice(start + 'BUDGET_JSON_START'.length, end).trim()
                try { setBudgetData(JSON.parse(raw)) } catch { /* keep null */ }
              }
              setPhase('reviewing')
            }
          } catch { /* skip */ }
        }
      }
    } catch {
      setPhase('idle')
    }
  }

  async function commitBudget() {
    if (!budgetData) return
    const authHeaders: Record<string, string> = authToken ? { Authorization: `Bearer ${authToken}` } : {}
    await fetch('/api/budget', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify(budgetData),
    })
    setStreamText('')
    setPhase('editing')
  }

  function reanalyze() {
    setPhase('idle')
    setStreamText('')
    setBudgetData(null)
  }

  if (loadingExisting) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
        <p style={{ fontFamily: fonts.mono, fontSize: 14, color: colors.textMuted, letterSpacing: '0.06em' }}>
          Loading...
        </p>
      </div>
    )
  }

  if (phase === 'idle') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        style={{ display: 'flex', flexDirection: 'column', gap: spacing.sectionGap }}
      >
        <MobileCard>
          <p style={{
            fontFamily: fonts.serif,
            fontSize: 22,
            fontWeight: 400,
            color: colors.text,
            marginBottom: 12,
          }}>
            Let Illumin analyze your finances
          </p>
          <p style={{
            fontFamily: fonts.mono,
            fontSize: 13,
            color: colors.textMuted,
            lineHeight: 1.8,
            marginBottom: spacing.sectionGap,
          }}>
            Illumin will review your income, spending history, debt, and savings to recommend the budgeting strategy that fits your situation. This takes about 10 seconds.
          </p>
          <button
            onClick={runAnalysis}
            style={{
              width: '100%',
              minHeight: spacing.tapTarget,
              backgroundColor: colors.gold,
              border: 'none',
              borderRadius: radius.button,
              color: colors.bg,
              fontFamily: fonts.mono,
              fontSize: 12,
              textTransform: 'uppercase' as const,
              letterSpacing: '0.1em',
              cursor: 'pointer',
            }}
          >
            Analyze My Finances
          </button>
        </MobileCard>
      </motion.div>
    )
  }

  if (phase === 'streaming') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        <MobileCard>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <p style={{
              fontFamily: fonts.mono,
              fontSize: 11,
              color: colors.textMuted,
              textTransform: 'uppercase' as const,
              letterSpacing: '0.16em',
            }}>
              Analyzing your finances...
            </p>
            <motion.div
              animate={{ opacity: [1, 0, 1] }}
              transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
              style={{ width: 2, height: 14, backgroundColor: colors.gold, borderRadius: 1, flexShrink: 0 }}
            />
          </div>
          <p style={{
            fontFamily: fonts.mono,
            fontSize: 13,
            color: colors.text,
            lineHeight: 1.9,
            whiteSpace: 'pre-wrap' as const,
          }}>
            {streamText}
          </p>
        </MobileCard>
      </motion.div>
    )
  }

  if (phase === 'reviewing') {
    const preview = budgetData
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sectionGap }}>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <MobileCard>
            <p style={{
              fontFamily: fonts.mono,
              fontSize: 11,
              color: colors.textMuted,
              textTransform: 'uppercase' as const,
              letterSpacing: '0.16em',
              marginBottom: spacing.sectionGap,
            }}>
              Analysis
            </p>
            <p style={{ fontFamily: fonts.mono, fontSize: 13, color: colors.text, lineHeight: 1.9, whiteSpace: 'pre-wrap' as const }}>
              {streamText}
            </p>
          </MobileCard>
        </motion.div>

        {preview && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.08 }}>
            <MobileCard>
              <p style={{
                fontFamily: fonts.mono,
                fontSize: 11,
                color: colors.textMuted,
                textTransform: 'uppercase' as const,
                letterSpacing: '0.16em',
                marginBottom: spacing.sectionGap,
              }}>
                Suggested Budget
              </p>
              <div style={{ marginBottom: spacing.sectionGap }}>
                <span style={{
                  fontFamily: fonts.mono,
                  fontSize: 11,
                  color: colors.gold,
                  backgroundColor: colors.goldSubtle,
                  border: `1px solid ${colors.goldBorder}`,
                  padding: '3px 10px',
                  borderRadius: radius.badge,
                  textTransform: 'uppercase' as const,
                  letterSpacing: '0.08em',
                }}>
                  {preview.strategy}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {preview.categories.map((cat, i) => {
                  const m = typeMeta[cat.type] ?? typeMeta.need
                  return (
                    <div key={i} style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: `${spacing.rowGap}px 0`,
                      borderBottom: i < preview.categories.length - 1 ? `1px solid ${colors.border}` : 'none',
                      gap: spacing.tightGap,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: spacing.tightGap, flex: 1, minWidth: 0 }}>
                        <span style={{
                          fontFamily: fonts.serif,
                          fontSize: 14,
                          color: colors.text,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap' as const,
                        }}>
                          {cat.name}
                        </span>
                        <span style={{
                          fontFamily: fonts.mono,
                          fontSize: 10,
                          textTransform: 'uppercase' as const,
                          letterSpacing: '0.08em',
                          padding: '2px 6px',
                          borderRadius: radius.badge,
                          color: m.color,
                          backgroundColor: m.bg,
                          flexShrink: 0,
                        }}>
                          {cat.type}
                        </span>
                      </div>
                      <span style={{ fontFamily: fonts.sans, fontSize: 15, color: colors.text, flexShrink: 0 }}>
                        {fmt(cat.amount)}
                      </span>
                    </div>
                  )
                })}
              </div>

              <div style={{ display: 'flex', gap: spacing.tightGap, marginTop: spacing.sectionGap }}>
                <button
                  onClick={reanalyze}
                  style={{
                    flex: 1,
                    minHeight: spacing.tapTarget,
                    backgroundColor: 'transparent',
                    border: `1px solid ${colors.border}`,
                    borderRadius: radius.button,
                    color: colors.textMuted,
                    fontFamily: fonts.mono,
                    fontSize: 12,
                    letterSpacing: '0.06em',
                    cursor: 'pointer',
                  }}
                >
                  Re-analyze
                </button>
                <button
                  onClick={commitBudget}
                  style={{
                    flex: 1,
                    minHeight: spacing.tapTarget,
                    backgroundColor: colors.gold,
                    border: 'none',
                    borderRadius: radius.button,
                    color: colors.bg,
                    fontFamily: fonts.mono,
                    fontSize: 12,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase' as const,
                    cursor: 'pointer',
                  }}
                >
                  Set Up Budget
                </button>
              </div>
            </MobileCard>
          </motion.div>
        )}
      </div>
    )
  }

  if (phase === 'editing' && budgetData) {
    return (
      <BudgetEditorMobile
        strategy={budgetData.strategy}
        initialIncome={budgetData.monthlyIncome}
        initialRows={toRows(budgetData.categories)}
        onReanalyze={reanalyze}
        authToken={authToken}
      />
    )
  }

  return null
}

// Default export

export default function BudgetPage() {
  const isMobile = useIsMobile()
  return isMobile ? <BudgetMobile /> : <BudgetDesktop />
}
