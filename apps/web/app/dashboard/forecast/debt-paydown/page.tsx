'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { supabase } from '@/lib/supabase'
import { useDashboard } from '@/lib/dashboardData'
import { usePortfolioHistoryQuery } from '@/lib/queries'
import DataTooltip from '@/components/ui/DataTooltip'
import {
  avalancheSchedule,
  balanceSeries,
  computeDeployableCash,
  computeEmergencyFundFloor,
  computeMinimumPayment,
  minimumPaymentSchedule,
  projectPortfolioGrowth,
  summarizeSchedule,
  type DebtType,
  type MonthlyPayment,
  type PaydownDebt,
} from '@/lib/debt-paydown'
import { updateAccountApr } from './actions'

const DEFAULT_APR = 0.24
const RISK_PREMIUM = 0.02
const DEFAULT_PORTFOLIO_YIELD = 0.07

interface AccountLike {
  id: string
  institutionName: string
  accountType: string
  classification?: string
  balance: number
  last4: string | null
  apr?: number | null
  aprConfirmedAt?: string | null
  customLabel?: string | null
}

function fmtCurrency(n: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Math.round(n))
}

function fmtPct(n: number, digits = 1) {
  return `${(n * 100).toFixed(digits)}%`
}

function fmtMonths(months: number, capped = false) {
  if (capped) return 'Never at this pace'
  if (months <= 0) return '0 months'
  const y = Math.floor(months / 12)
  const m = months % 12
  if (y === 0) return `${m} month${m === 1 ? '' : 's'}`
  if (m === 0) return `${y} year${y === 1 ? '' : 's'}`
  return `${y} yr ${m} mo`
}

function classifyDebtType(accountType: string): DebtType {
  const t = (accountType ?? '').toLowerCase().trim()
  if (t.includes('credit')) return 'credit'
  return 'loan'
}

function debtLabel(account: AccountLike): string {
  if (account.customLabel && account.customLabel.trim()) return account.customLabel.trim()
  const parts: string[] = []
  if (account.institutionName) parts.push(account.institutionName)
  if (account.accountType) parts.push(titleCase(account.accountType))
  const name = parts.join(' ') || 'Debt'
  return account.last4 ? `${name} \u00b7\u00b7\u00b7\u00b7${account.last4}` : name
}

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .split(/\s+/)
    .map(w => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ')
}

// ── Shared styles ────────────────────────────────────────────────────────────

const card: React.CSSProperties = {
  backgroundColor: 'var(--color-surface)',
  border: '1px solid var(--color-gold-border)',
  borderRadius: '2px',
  padding: '28px',
}

const sectionLabel: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '12px',
  color: 'var(--color-text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.16em',
  marginBottom: 'var(--space-card-label-to-body)',
}

const microLabel: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '10px',
  color: 'var(--color-text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.14em',
  marginBottom: 'var(--space-label-to-value)',
}

const metricLarge: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '30px',
  color: 'var(--color-text)',
  lineHeight: 1.1,
  letterSpacing: '-0.01em',
  margin: 0,
}

const metricMid: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '18px',
  color: 'var(--color-text)',
  margin: 0,
}

const metricMuted: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '13px',
  color: 'var(--color-text-mid)',
  margin: 0,
  lineHeight: 1.5,
}

// ── Portfolio yield fetcher ──────────────────────────────────────────────────

interface PortfolioHistoryResponse {
  portfolioAnnualizedReturn: number | null
  portfolioReturn: number | null
  totalPortfolioValue: number
}

function usePortfolioYield(): {
  yieldValue: number
  portfolioValue: number
  source: 'portfolio' | 'default'
  loading: boolean
} {
  const { data, isLoading } = usePortfolioHistoryQuery<PortfolioHistoryResponse>('1y')
  if (!data) {
    return {
      yieldValue: DEFAULT_PORTFOLIO_YIELD,
      portfolioValue: 0,
      source: 'default',
      loading: isLoading,
    }
  }
  const y = data.portfolioAnnualizedReturn
  const usable = typeof y === 'number' && Number.isFinite(y) && y !== 0
  return {
    yieldValue: usable ? (y as number) : DEFAULT_PORTFOLIO_YIELD,
    portfolioValue: data.totalPortfolioValue ?? 0,
    source: usable ? 'portfolio' : 'default',
    loading: isLoading,
  }
}

// ── Inline APR editor ────────────────────────────────────────────────────────
//
// Only one editor is open at a time. State lives on the page so clicking
// another APR field auto-saves the current draft and opens the next one.

interface AprEditorApi {
  editingAccountId: string | null
  draft: string
  savingAccountId: string | null
  setDraft: (value: string) => void
  beginEdit: (accountId: string, currentApr: number) => void
  commitEdit: () => void
  cancelEdit: () => void
}

function useAprEditor(
  onSaved: (accountId: string, nextApr: number, confirmedAt: string | null) => void,
): AprEditorApi {
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [savingAccountId, setSavingAccountId] = useState<string | null>(null)

  const stateRef = useRef({ editingAccountId, draft })
  useEffect(() => {
    stateRef.current = { editingAccountId, draft }
  })

  const saveInBackground = useCallback(
    (accountId: string, draftValue: string) => {
      const pct = parseFloat(draftValue)
      if (!Number.isFinite(pct) || pct < 0) return
      const nextApr = pct / 100
      setSavingAccountId(accountId)
      updateAccountApr(accountId, nextApr)
        .then(result => {
          if (result.ok) {
            onSaved(accountId, result.apr ?? nextApr, result.aprConfirmedAt ?? null)
          }
        })
        .catch(err => {
          console.error('[DebtPaydown] updateAccountApr failed:', err)
        })
        .finally(() => {
          setSavingAccountId(prev => (prev === accountId ? null : prev))
        })
    },
    [onSaved],
  )

  const commitEdit = useCallback(() => {
    const { editingAccountId: id, draft: value } = stateRef.current
    if (!id) return
    setEditingAccountId(null)
    setDraft('')
    saveInBackground(id, value)
  }, [saveInBackground])

  const beginEdit = useCallback(
    (accountId: string, currentApr: number) => {
      const { editingAccountId: prevId, draft: prevDraft } = stateRef.current
      if (prevId && prevId !== accountId) {
        saveInBackground(prevId, prevDraft)
      }
      setEditingAccountId(accountId)
      setDraft((currentApr * 100).toFixed(2))
    },
    [saveInBackground],
  )

  const cancelEdit = useCallback(() => {
    setEditingAccountId(null)
    setDraft('')
  }, [])

  return {
    editingAccountId,
    draft,
    savingAccountId,
    setDraft,
    beginEdit,
    commitEdit,
    cancelEdit,
  }
}

function InlineAprEditor({
  accountId,
  apr,
  isDefault,
  editor,
}: {
  accountId: string
  apr: number
  isDefault: boolean
  editor: AprEditorApi
}) {
  const isEditing = editor.editingAccountId === accountId
  const isSaving = editor.savingAccountId === accountId
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditing) {
      const el = inputRef.current
      if (el) {
        el.focus()
        el.select()
      }
    }
  }, [isEditing])

  if (!isEditing) {
    return (
      <button
        type="button"
        data-apr-trigger
        onMouseDown={e => e.stopPropagation()}
        onClick={e => {
          e.stopPropagation()
          editor.beginEdit(accountId, apr)
        }}
        style={{
          background: 'none',
          border: 'none',
          padding: '4px 8px',
          borderRadius: '2px',
          cursor: isSaving ? 'wait' : 'pointer',
          fontFamily: 'var(--font-mono)',
          fontSize: '13px',
          color: isDefault ? 'var(--color-negative)' : 'var(--color-text)',
          borderBottom: '1px dotted var(--color-gold-border)',
          opacity: isSaving ? 0.6 : 1,
        }}
        title={isDefault ? 'Default 24 percent assumed. Click to set the actual APR.' : 'Edit APR'}
      >
        {fmtPct(apr, 2)}{isDefault ? ' (assumed)' : ''}
      </button>
    )
  }

  return (
    <span
      data-apr-editor
      onClick={e => e.stopPropagation()}
      onMouseDown={e => e.stopPropagation()}
      style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
    >
      <input
        ref={inputRef}
        type="number"
        step="0.01"
        min="0"
        value={editor.draft}
        onChange={e => editor.setDraft(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') {
            e.preventDefault()
            e.stopPropagation()
            editor.commitEdit()
          }
          if (e.key === 'Escape') {
            e.preventDefault()
            e.stopPropagation()
            editor.cancelEdit()
          }
        }}
        style={{
          width: '72px',
          padding: '4px 6px',
          fontFamily: 'var(--font-mono)',
          fontSize: '13px',
          color: 'var(--color-text)',
          background: 'var(--color-surface-2)',
          border: '1px solid var(--color-gold-border)',
          borderRadius: '2px',
        }}
      />
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--color-text-muted)' }}>%</span>
    </span>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function DebtPaydownPage() {
  const { loading, accounts, setAccounts, forecast } = useDashboard()
  const portfolio = usePortfolioYield()
  const [scheduleView, setScheduleView] = useState<'aggressive' | 'minimum'>('aggressive')
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set())

  // Hydrate APR overrides locally so the server action result updates the
  // dashboard-shared accounts array immediately.
  const handleAprSaved = useCallback(
    (accountId: string, nextApr: number, confirmedAt: string | null) => {
      setAccounts(prev =>
        prev.map(a =>
          a.id === accountId
            ? ({ ...a, apr: nextApr, aprConfirmedAt: confirmedAt } as typeof a)
            : a,
        ),
      )
    },
    [setAccounts],
  )

  const aprEditor = useAprEditor(handleAprSaved)

  // Clicking anywhere outside the currently-open editor commits the draft.
  // Clicks on another APR trigger button go through beginEdit, which saves
  // the previous draft on its own, so we skip them here to avoid racing.
  useEffect(() => {
    if (!aprEditor.editingAccountId) return
    const commit = aprEditor.commitEdit
    function handleDocMouseDown(e: MouseEvent) {
      const target = e.target as HTMLElement | null
      if (!target) return
      if (target.closest('[data-apr-editor]')) return
      if (target.closest('[data-apr-trigger]')) return
      commit()
    }
    document.addEventListener('mousedown', handleDocMouseDown)
    return () => document.removeEventListener('mousedown', handleDocMouseDown)
  }, [aprEditor.editingAccountId, aprEditor.commitEdit])

  const typedAccounts = accounts as unknown as AccountLike[]

  // Split accounts
  const debtAccounts = useMemo(
    () => typedAccounts.filter(a => a.classification === 'liability' && Math.abs(a.balance) > 0),
    [typedAccounts],
  )
  const cashAccounts = useMemo(
    () => {
      const liquid = new Set(['checking', 'CHECKING', 'savings', 'SAVINGS'])
      return typedAccounts.filter(a => liquid.has(a.accountType))
    },
    [typedAccounts],
  )
  const totalCash = cashAccounts.reduce((s, a) => s + Math.max(0, a.balance), 0)

  // Build PaydownDebt inputs
  const debts: PaydownDebt[] = useMemo(
    () =>
      debtAccounts.map(a => ({
        accountId: a.id,
        label: debtLabel(a),
        type: classifyDebtType(a.accountType),
        balance: Math.abs(a.balance),
        apr: a.apr ?? DEFAULT_APR,
      })),
    [debtAccounts],
  )

  // Cash flow inputs (trailing-3-month averages live on forecast.avgExpenses / avgSavings)
  const monthlyExpenses = forecast?.avgExpenses ?? 0
  const freeCashFlow = Math.max(0, forecast?.avgSavings ?? 0)
  const emergencyFundFloor = computeEmergencyFundFloor(monthlyExpenses)
  const deployableCash = computeDeployableCash(totalCash, emergencyFundFloor)

  // Totals and weighted APR
  const totalDebt = debts.reduce((s, d) => s + d.balance, 0)
  const weightedApr = totalDebt > 0
    ? debts.reduce((s, d) => s + d.balance * d.apr, 0) / totalDebt
    : 0

  // Run scenarios
  const aggressiveSchedule = useMemo(
    () => (debts.length > 0 ? avalancheSchedule(debts, freeCashFlow, deployableCash) : []),
    [debts, freeCashFlow, deployableCash],
  )
  const minimumSchedule = useMemo(
    () => (debts.length > 0 ? minimumPaymentSchedule(debts) : []),
    [debts],
  )

  const aggressiveSummary = summarizeSchedule(aggressiveSchedule, debts)
  const minimumSummary = summarizeSchedule(minimumSchedule, debts)

  // Opportunity cost (Scenario A): over the payoff window the user invests nothing.
  // Their principal would have been deployableCash at the start, compounding at
  // adjusted yield over the payoff months. Since Scenario A commits all free cash
  // and deployable cash to debt, there are no monthly contributions in this
  // projection.
  const adjustedYield = Math.max(0, portfolio.yieldValue - RISK_PREMIUM)
  const aggressiveForegoneGrowth = projectPortfolioGrowth(
    deployableCash,
    0,
    portfolio.yieldValue,
    aggressiveSummary.months,
  ) - deployableCash

  // Scenario B: invest free cash flow every month over the minimum-only payoff
  // window (or 600 months capped). Deployable cash is already invested.
  const minimumInvestmentMonths = minimumSummary.capped
    ? 600
    : minimumSummary.months
  const minimumPortfolioFv = projectPortfolioGrowth(
    deployableCash,
    freeCashFlow,
    portfolio.yieldValue,
    minimumInvestmentMonths,
  )
  const minimumPortfolioGrowth = minimumPortfolioFv - (deployableCash + freeCashFlow * minimumInvestmentMonths)

  // Net cost
  const aggressiveNetCost = aggressiveSummary.totalInterest + aggressiveForegoneGrowth
  const minimumNetCost = minimumSummary.totalInterest - minimumPortfolioGrowth

  // Recommendation
  type Recommendation = 'aggressive' | 'minimum' | 'tossup'
  let recommendation: Recommendation
  if (weightedApr > portfolio.yieldValue) {
    recommendation = 'aggressive'
  } else if (weightedApr < adjustedYield) {
    recommendation = 'minimum'
  } else {
    recommendation = 'tossup'
  }

  // Chart data
  const chartData = useMemo(() => {
    if (debts.length === 0) return []
    const aSeries = balanceSeries(aggressiveSchedule, debts)
    const mSeries = balanceSeries(minimumSchedule, debts)
    const maxMonths = Math.max(
      aSeries[aSeries.length - 1]?.month ?? 0,
      mSeries[mSeries.length - 1]?.month ?? 0,
    )
    const ceiling = 180
    const stride = maxMonths > ceiling ? Math.ceil(maxMonths / ceiling) : 1
    const at = (series: { month: number; balance: number }[], m: number) => {
      const idx = Math.min(m, series.length - 1)
      return Math.round(series[idx]?.balance ?? 0)
    }
    const points: { month: number; aggressive: number; minimum: number }[] = []
    for (let m = 0; m <= maxMonths; m += stride) {
      points.push({ month: m, aggressive: at(aSeries, m), minimum: at(mSeries, m) })
    }
    if (points[points.length - 1]?.month !== maxMonths) {
      points.push({ month: maxMonths, aggressive: at(aSeries, maxMonths), minimum: at(mSeries, maxMonths) })
    }
    return points
  }, [aggressiveSchedule, minimumSchedule, debts])

  // Schedule grouped by account
  const visibleSchedule = scheduleView === 'aggressive' ? aggressiveSchedule : minimumSchedule
  const scheduleByAccount = useMemo(() => {
    const map = new Map<string, MonthlyPayment[]>()
    for (const row of visibleSchedule) {
      const arr = map.get(row.accountId) ?? []
      arr.push(row)
      map.set(row.accountId, arr)
    }
    return map
  }, [visibleSchedule])

  const toggleExpanded = (accountId: string) => {
    setExpandedAccounts(prev => {
      const next = new Set(prev)
      if (next.has(accountId)) next.delete(accountId)
      else next.add(accountId)
      return next
    })
  }

  // ── Loading / empty states ─────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '320px' }}>
        <p style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '14px',
          color: 'var(--color-text-muted)',
          letterSpacing: '0.06em',
        }}>
          Loading...
        </p>
      </div>
    )
  }

  if (debts.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div>
          <h1 style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '36px',
            fontWeight: 400,
            color: 'var(--color-text)',
            margin: 0,
            letterSpacing: '-0.01em',
          }}>
            Debt Paydown Plan
          </h1>
        </div>
        <div style={{ ...card, textAlign: 'center', padding: '64px 32px' }}>
          <p style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '22px',
            color: 'var(--color-text)',
            marginBottom: '10px',
          }}>
            No debt to plan around.
          </p>
          <p style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '13px',
            color: 'var(--color-text-muted)',
            lineHeight: 1.7,
          }}>
            Link a credit card or loan account in Accounts to build a paydown plan.
          </p>
        </div>
      </div>
    )
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
      >
        <h1 style={{
          fontFamily: 'var(--font-serif)',
          fontSize: '36px',
          fontWeight: 400,
          color: 'var(--color-text)',
          margin: 0,
          letterSpacing: '-0.01em',
        }}>
          Debt Paydown Plan
        </h1>
        <p style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '13px',
          color: 'var(--color-text-muted)',
          letterSpacing: '0.04em',
          marginTop: '8px',
        }}>
          {fmtCurrency(totalDebt)} across {debts.length} {debts.length === 1 ? 'account' : 'accounts'} at {fmtPct(weightedApr, 2)} weighted APR.
        </p>
      </motion.div>

      {/* Scenario cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut', delay: 0.06 }}
          style={{
            ...card,
            borderLeft: recommendation === 'aggressive' ? '3px solid var(--color-gold)' : '1px solid var(--color-gold-border)',
          }}
        >
          <p style={microLabel}>Scenario A: Pay down aggressively</p>
          <p style={{ ...metricMuted, marginBottom: '20px' }}>
            Avalanche strategy. Highest-APR debt first. Deploy {fmtCurrency(deployableCash)} above the {fmtCurrency(emergencyFundFloor)} emergency floor as a lump sum, then direct {fmtCurrency(freeCashFlow)} / month into extra principal. Roll each paid-off minimum into the next.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div>
              <p style={microLabel}>Months to debt-free</p>
              <p style={metricLarge}>
                <DataTooltip
                  value={aggressiveSummary.months}
                  title="Months to debt-free"
                  computationNote="Simulation runs minimums plus extra principal on the highest-APR debt each month, rolling as debts clear."
                  sources={[
                    { label: 'Total debt', value: totalDebt, type: 'computed' },
                    { label: 'Lump sum deployed', value: deployableCash, type: 'computed' },
                    { label: 'Extra monthly', value: freeCashFlow, type: 'computed' },
                  ]}
                  formatter={n => fmtMonths(n, aggressiveSummary.capped)}
                >
                  {fmtMonths(aggressiveSummary.months, aggressiveSummary.capped)}
                </DataTooltip>
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <p style={microLabel}>Total interest</p>
                <p style={metricMid}>{fmtCurrency(aggressiveSummary.totalInterest)}</p>
              </div>
              <div>
                <p style={microLabel}>Foregone growth</p>
                <p style={metricMid}>{fmtCurrency(aggressiveForegoneGrowth)}</p>
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-section-below)' }}>
              <p style={microLabel}>Net cost of this strategy</p>
              <p style={{ ...metricMid, color: 'var(--color-negative)' }}>
                {fmtCurrency(aggressiveNetCost)}
              </p>
              <p style={{ ...metricMuted, marginTop: 'var(--space-value-to-subtext)', fontSize: '11px' }}>
                Interest paid plus foregone portfolio growth on the lump sum over the payoff window.
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut', delay: 0.12 }}
          style={{
            ...card,
            borderLeft: recommendation === 'minimum' ? '3px solid var(--color-gold)' : '1px solid var(--color-gold-border)',
          }}
        >
          <p style={microLabel}>Scenario B: Keep investing</p>
          <p style={{ ...metricMuted, marginBottom: '20px' }}>
            Minimum payments only on all debts. Leave {fmtCurrency(deployableCash)} deployable cash invested. Direct {fmtCurrency(freeCashFlow)} / month into the portfolio at {fmtPct(portfolio.yieldValue, 1)} yield.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div>
              <p style={microLabel}>Months to debt-free</p>
              <p style={metricLarge}>
                <DataTooltip
                  value={minimumSummary.months}
                  title="Months to debt-free on minimums"
                  computationNote="Credit card minimums are max(2 percent of balance, $25). Installment loans use stored or amortized monthly payments."
                  sources={[
                    { label: 'Total debt', value: totalDebt, type: 'computed' },
                    { label: 'Weighted APR', value: weightedApr, type: 'computed' },
                  ]}
                  formatter={n => fmtMonths(n, minimumSummary.capped)}
                >
                  {fmtMonths(minimumSummary.months, minimumSummary.capped)}
                </DataTooltip>
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <p style={microLabel}>Total interest</p>
                <p style={metricMid}>{fmtCurrency(minimumSummary.totalInterest)}</p>
              </div>
              <div>
                <p style={microLabel}>Portfolio growth</p>
                <p style={{ ...metricMid, color: 'var(--color-positive)' }}>
                  {fmtCurrency(minimumPortfolioGrowth)}
                </p>
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-section-below)' }}>
              <p style={microLabel}>Net cost of this strategy</p>
              <p style={{ ...metricMid, color: minimumNetCost > 0 ? 'var(--color-negative)' : 'var(--color-positive)' }}>
                {fmtCurrency(minimumNetCost)}
              </p>
              <p style={{ ...metricMuted, marginTop: 'var(--space-value-to-subtext)', fontSize: '11px' }}>
                Interest paid minus portfolio growth on the free cash flow. Negative means growth outpaced interest.
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Recommendation strip */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut', delay: 0.18 }}
        style={{
          ...card,
          borderLeft: '3px solid var(--color-gold)',
        }}
      >
        <p style={microLabel}>Recommendation</p>
        <p style={{
          fontFamily: 'var(--font-serif)',
          fontSize: '22px',
          color: 'var(--color-text)',
          marginBottom: '12px',
          lineHeight: 1.4,
        }}>
          {recommendation === 'aggressive' &&
            `Pay down the debt. Your weighted APR of ${fmtPct(weightedApr, 2)} is higher than a ${fmtPct(adjustedYield, 1)} risk-adjusted portfolio yield.`}
          {recommendation === 'minimum' &&
            `Keep investing. Your ${fmtPct(adjustedYield, 1)} risk-adjusted yield outpaces a ${fmtPct(weightedApr, 2)} weighted debt APR.`}
          {recommendation === 'tossup' &&
            `This is a genuine toss-up. Your ${fmtPct(weightedApr, 2)} weighted APR sits inside the risk-premium buffer between ${fmtPct(adjustedYield, 1)} and ${fmtPct(portfolio.yieldValue, 1)}.`}
        </p>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '14px',
          padding: '14px 0',
          borderTop: '1px solid var(--color-border)',
          borderBottom: '1px solid var(--color-border)',
          marginBottom: '14px',
        }}>
          <div>
            <p style={microLabel}>Weighted debt APR</p>
            <p style={metricMid}>{fmtPct(weightedApr, 2)}</p>
          </div>
          <div>
            <p style={microLabel}>Portfolio yield</p>
            <p style={metricMid}>{fmtPct(portfolio.yieldValue, 1)}</p>
          </div>
          <div>
            <p style={microLabel}>Adjusted yield</p>
            <p style={metricMid}>{fmtPct(adjustedYield, 1)}</p>
          </div>
        </div>
        <p style={{ ...metricMuted, fontSize: '12px' }}>
          Debt paydown is a guaranteed return. Investment yield is expected, not guaranteed. We apply a {fmtPct(RISK_PREMIUM, 0)} risk premium when comparing the two.{portfolio.source === 'default' ? ` No portfolio return data available yet, so we assumed ${fmtPct(DEFAULT_PORTFOLIO_YIELD, 0)}.` : ''}
        </p>
      </motion.div>

      {/* Projection chart */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut', delay: 0.24 }}
        style={card}
      >
        <p style={sectionLabel}>Debt-Free Projection</p>
        <div style={{ width: '100%', height: '320px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 24, left: 8, bottom: 28 }}>
              <CartesianGrid stroke="var(--color-grid-line)" strokeDasharray="2 4" vertical={false} />
              <XAxis
                dataKey="month"
                stroke="var(--color-text-muted)"
                tickLine={false}
                tick={{ fontFamily: 'var(--font-mono)', fontSize: 11, fill: 'var(--color-text-muted)' }}
                label={{
                  value: 'Months from today',
                  position: 'insideBottom',
                  offset: -4,
                  style: {
                    fontFamily: 'var(--font-mono)',
                    fontSize: 10,
                    fill: 'var(--color-text-muted)',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                  },
                }}
              />
              <YAxis
                stroke="var(--color-text-muted)"
                tickLine={false}
                tick={{ fontFamily: 'var(--font-mono)', fontSize: 11, fill: 'var(--color-text-muted)' }}
                tickFormatter={n => {
                  const abs = Math.abs(n)
                  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
                  if (abs >= 1_000) return `${Math.round(n / 1_000)}K`
                  return `${Math.round(n)}`
                }}
              />
              <RechartsTooltip
                contentStyle={{
                  backgroundColor: 'var(--color-surface-2)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '2px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '12px',
                }}
                formatter={(v, name) => [fmtCurrency(typeof v === 'number' ? v : Number(v)), name === 'aggressive' ? 'Scenario A' : 'Scenario B']}
                labelFormatter={m => `Month ${m}`}
              />
              <Legend
                wrapperStyle={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                }}
                formatter={v => (v === 'aggressive' ? 'Scenario A: Aggressive' : 'Scenario B: Minimums')}
              />
              <Line
                type="monotone"
                dataKey="aggressive"
                stroke="var(--color-gold)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="minimum"
                stroke="var(--color-text-muted)"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                dot={false}
                activeDot={{ r: 4 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Schedule table */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut', delay: 0.3 }}
        style={card}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <p style={{ ...sectionLabel, marginBottom: 0 }}>Paydown Schedule</p>
          <div style={{
            display: 'flex',
            border: '1px solid var(--color-border)',
            borderRadius: '2px',
            overflow: 'hidden',
          }}>
            {([
              { key: 'aggressive' as const, label: 'Scenario A' },
              { key: 'minimum' as const, label: 'Scenario B' },
            ]).map((opt, i) => {
              const active = scheduleView === opt.key
              return (
                <button
                  key={opt.key}
                  onClick={() => setScheduleView(opt.key)}
                  style={{
                    padding: '8px 16px',
                    background: active ? 'var(--color-gold-subtle)' : 'transparent',
                    border: 'none',
                    borderLeft: i === 0 ? 'none' : '1px solid var(--color-border)',
                    color: active ? 'var(--color-text)' : 'var(--color-text-mid)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                  }}
                >
                  {opt.label}
                </button>
              )
            })}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {debts.map(d => {
            const account = debtAccounts.find(a => a.id === d.accountId)
            const rows = scheduleByAccount.get(d.accountId) ?? []
            const isExpanded = expandedAccounts.has(d.accountId)
            const firstRow = rows[0]
            const lastRow = rows[rows.length - 1]
            const accountInterest = rows.reduce((s, r) => s + r.interest, 0)
            const minPreview = computeMinimumPayment(d)

            return (
              <div
                key={d.accountId}
                style={{
                  border: '1px solid var(--color-border)',
                  borderRadius: '2px',
                  overflow: 'hidden',
                }}
              >
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => toggleExpanded(d.accountId)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      toggleExpanded(d.accountId)
                    }
                  }}
                  style={{
                    width: '100%',
                    display: 'grid',
                    gridTemplateColumns: '2fr 1fr 1fr 1fr 0.5fr',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '14px 18px',
                    background: 'transparent',
                    border: 'none',
                    borderBottom: isExpanded ? '1px solid var(--color-border)' : 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <div>
                    <p style={{ fontFamily: 'var(--font-serif)', fontSize: '15px', color: 'var(--color-text)', margin: 0 }}>
                      {d.label}
                    </p>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--color-text-muted)', margin: '4px 0 0 0' }}>
                      {d.type === 'credit' ? 'Credit card' : 'Installment loan'}
                    </p>
                  </div>
                  <div>
                    <p style={{ ...microLabel, marginBottom: '2px' }}>APR</p>
                    <span style={{ display: 'inline-block' }}>
                      {account ? (
                        <InlineAprEditor
                          accountId={account.id}
                          apr={d.apr}
                          isDefault={account.apr == null}
                          editor={aprEditor}
                        />
                      ) : (
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--color-text)' }}>
                          {fmtPct(d.apr, 2)}
                        </span>
                      )}
                    </span>
                  </div>
                  <div>
                    <p style={{ ...microLabel, marginBottom: '2px' }}>Balance</p>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', color: 'var(--color-text)', margin: 0 }}>
                      {fmtCurrency(d.balance)}
                    </p>
                  </div>
                  <div>
                    <p style={{ ...microLabel, marginBottom: '2px' }}>
                      {scheduleView === 'aggressive' ? 'Paid off' : 'Min / mo'}
                    </p>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', color: 'var(--color-text)', margin: 0 }}>
                      {scheduleView === 'aggressive'
                        ? (lastRow ? `Month ${lastRow.month}` : '--')
                        : fmtCurrency(minPreview)}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{
                      display: 'inline-block',
                      transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 120ms ease',
                      color: 'var(--color-text-muted)',
                    }}>
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M1 3.5L5 7.5L9 3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  </div>
                </div>

                {isExpanded && (
                  <div style={{ padding: '12px 18px 18px', overflowX: 'auto' }}>
                    <p style={{ ...metricMuted, fontSize: '11px', marginBottom: '10px' }}>
                      First payment: {firstRow ? fmtCurrency(firstRow.payment) : '--'} &middot; Interest over life of debt: {fmtCurrency(accountInterest)}
                    </p>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-mono)' }}>
                      <thead>
                        <tr>
                          {['Month', 'Balance Start', 'Payment', 'Interest', 'Principal', 'Balance End'].map((h, i) => (
                            <th
                              key={h}
                              style={{
                                fontSize: '10px',
                                color: 'var(--color-text-muted)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.1em',
                                textAlign: i === 0 ? 'left' : 'right',
                                padding: '6px 8px',
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
                        {rows.slice(0, 60).map((row, i) => (
                          <tr
                            key={`${row.accountId}-${row.month}`}
                            style={{
                              background: i % 2 === 0 ? 'transparent' : 'var(--color-surface-texture)',
                            }}
                          >
                            <td style={{ padding: '6px 8px', fontSize: '12px', color: 'var(--color-text-mid)' }}>{row.month}</td>
                            <td style={{ padding: '6px 8px', fontSize: '12px', color: 'var(--color-text)', textAlign: 'right' }}>{fmtCurrency(row.balanceStart)}</td>
                            <td style={{ padding: '6px 8px', fontSize: '12px', color: 'var(--color-text)', textAlign: 'right' }}>{fmtCurrency(row.payment)}</td>
                            <td style={{ padding: '6px 8px', fontSize: '12px', color: 'var(--color-negative)', textAlign: 'right' }}>{fmtCurrency(row.interest)}</td>
                            <td style={{ padding: '6px 8px', fontSize: '12px', color: 'var(--color-positive)', textAlign: 'right' }}>{fmtCurrency(row.principal)}</td>
                            <td style={{ padding: '6px 8px', fontSize: '12px', color: 'var(--color-text)', textAlign: 'right' }}>{fmtCurrency(row.balanceEnd)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {rows.length > 60 && (
                      <p style={{ ...metricMuted, fontSize: '11px', marginTop: '10px' }}>
                        Showing first 60 of {rows.length} months.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </motion.div>

    </div>
  )
}
