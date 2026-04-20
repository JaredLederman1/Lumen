'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { useDashboard } from '@/lib/dashboardData'
import {
  useChecklistQuery,
  useToggleChecklistItemMutation,
  useClearCompletedChecklistMutation,
  useMarkBenefitActionMutation,
} from '@/lib/queries'
import { crossCheckBenefits } from '@/lib/benefitsAnalysis'
import type { BenefitStatus } from '@/lib/benefitsAnalysis'
import ChecklistItem from '@/components/ui/ChecklistItem'

// ── Types ─────────────────────────────────────────────────────────────────────

type CoachItem = {
  id: string
  text: string
  completed: boolean
  createdAt: string
}

// ── Styles ────────────────────────────────────────────────────────────────────

const card: React.CSSProperties = {
  backgroundColor: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: '2px',
  padding: '28px',
}

const sectionLabel: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '12px',
  color: 'var(--color-text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.16em',
  marginBottom: '20px',
}

// ── Color maps ────────────────────────────────────────────────────────────────

const urgencyColors: Record<BenefitStatus['urgency'], { dot: string; bg: string; border: string }> = {
  critical: { dot: 'var(--color-negative)',  bg: 'var(--color-negative-bg)',  border: 'var(--color-negative-border)' },
  high:     { dot: 'var(--color-gold)',       bg: 'var(--color-gold-subtle)', border: 'var(--color-gold-border)'      },
  medium:   { dot: 'var(--color-text-mid)',   bg: 'var(--color-surface-2)',   border: 'var(--color-border)'           },
  info:     { dot: 'var(--color-text-muted)', bg: 'var(--color-surface-2)',   border: 'var(--color-border)'           },
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

// ── Checkbox ──────────────────────────────────────────────────────────────────

function Checkbox({ checked, color, onClick }: { checked: boolean; color: string; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        width: 16, height: 16, borderRadius: 2, flexShrink: 0,
        border: `1.5px solid ${checked ? 'var(--color-positive)' : color}`,
        backgroundColor: checked ? 'var(--color-positive)' : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginTop: 1, transition: 'all 150ms ease', cursor: 'pointer',
      }}
    >
      {checked && (
        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
          <path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ChecklistPage() {
  const { loading, benefits, setBenefits } = useDashboard()

  const { data: checklistData, isLoading: coachLoading } =
    useChecklistQuery<{ items?: CoachItem[] }>()
  const coachItems = checklistData?.items ?? []
  const toggleItem = useToggleChecklistItemMutation()
  const clearCompleted = useClearCompletedChecklistMutation()
  const markBenefit = useMarkBenefitActionMutation()

  const [clearConfirm, setClearConfirm]       = useState(false)
  const [benefitsDone, setBenefitsDone]       = useState<string[]>(benefits?.actionItemsDone ?? [])
  const clearConfirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Sync benefitsDone when benefits loads
  useEffect(() => {
    if (benefits?.actionItemsDone) setBenefitsDone(benefits.actionItemsDone)
  }, [benefits])

  const toggleCoachItem = useCallback((id: string, completed: boolean) => {
    toggleItem.mutate({ id, completed })
  }, [toggleItem])

  const handleClearCompleted = useCallback(() => {
    if (!clearConfirm) {
      setClearConfirm(true)
      clearConfirmTimer.current = setTimeout(() => setClearConfirm(false), 3000)
      return
    }
    setClearConfirm(false)
    if (clearConfirmTimer.current) clearTimeout(clearConfirmTimer.current)
    clearCompleted.mutate()
  }, [clearConfirm, clearCompleted])

  const toggleBenefitItem = useCallback((label: string, checked: boolean) => {
    const next = checked ? [...benefitsDone, label] : benefitsDone.filter(l => l !== label)
    setBenefitsDone(next)
    if (benefits) setBenefits({ ...benefits, actionItemsDone: next })
    markBenefit.mutate({ label, done: checked })
  }, [benefitsDone, benefits, setBenefits, markBenefit])

  // Benefits checklist items
  const crossCheck = benefits?.extracted
    ? crossCheckBenefits(benefits.extracted)
    : (benefits?.crossCheck ?? [])
  const benefitItems = crossCheck.filter(s => s.urgency !== 'info')

  // Completion stats
  const coachDone = coachItems.filter(i => i.completed).length
  const benefitsDoneCount = benefitItems.filter(b => benefitsDone.includes(b.label)).length
  const totalItems = coachItems.length + benefitItems.length
  const totalDone  = coachDone + benefitsDoneCount

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        style={{
          ...card,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <p style={{ fontFamily: 'var(--font-serif)', fontSize: '24px', color: 'var(--color-text)', marginBottom: '4px' }}>
            Financial Checklist
          </p>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--color-text-muted)' }}>
            {totalItems > 0
              ? `${totalDone} of ${totalItems} complete`
              : 'Use the Illumin Engine to generate recommendations'}
          </p>
        </div>
      </motion.div>

      {/* Progress bar */}
      {totalItems > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          style={{ ...card, padding: '20px 28px' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--color-text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              Overall progress
            </p>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--color-text-mid)' }}>
              {totalItems > 0 ? Math.round((totalDone / totalItems) * 100) : 0}%
            </p>
          </div>
          <div style={{ height: '4px', backgroundColor: 'var(--color-gold-subtle)', borderRadius: '2px', overflow: 'hidden' }}>
            <motion.div
              animate={{ width: `${totalItems > 0 ? (totalDone / totalItems) * 100 : 0}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              style={{ height: '100%', backgroundColor: 'var(--color-gold)', borderRadius: '2px' }}
            />
          </div>
        </motion.div>
      )}

      {/* Coach recommendations */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.06 }}
        style={card}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <p style={{ ...sectionLabel, marginBottom: 0 }}>Coach recommendations</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {coachItems.some(i => i.completed) && (
              <button
                onClick={handleClearCompleted}
                style={{
                  padding: '4px 12px',
                  background: clearConfirm ? 'var(--color-negative-bg)' : 'none',
                  border: `1px solid ${clearConfirm ? 'var(--color-negative-border)' : 'var(--color-border)'}`,
                  borderRadius: '2px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  letterSpacing: '0.06em',
                  color: clearConfirm ? 'var(--color-negative)' : 'var(--color-text-muted)',
                  cursor: 'pointer',
                  transition: 'all 150ms ease',
                }}
              >
                {clearConfirm ? 'Confirm remove' : 'Clear completed'}
              </button>
            )}
            {coachItems.length > 0 && (
              <p style={{
                fontFamily: 'var(--font-mono)', fontSize: '13px',
                color: coachDone === coachItems.length ? 'var(--color-positive)' : 'var(--color-text-mid)',
              }}>
                {coachDone} / {coachItems.length} done
              </p>
            )}
          </div>
        </div>

        {coachLoading && (
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', color: 'var(--color-text-muted)' }}>
            Loading...
          </p>
        )}

        {!coachLoading && coachItems.length === 0 && (
          <div style={{ padding: '8px 0' }}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', color: 'var(--color-text-muted)', lineHeight: 1.7 }}>
              No recommendations yet. Ask the Illumin Engine for financial advice and save its recommendations here.
            </p>
          </div>
        )}

        {!coachLoading && coachItems.length > 0 && (
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.04 } } }}
            style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}
          >
            <AnimatePresence>
              {coachItems.map(item => (
                <motion.div
                  key={item.id}
                  layout
                  variants={{ hidden: { opacity: 0, x: -6 }, visible: { opacity: 1, x: 0, transition: { duration: 0.25 } } }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <ChecklistItem
                    text={item.text}
                    checked={item.completed}
                    onChange={(checked) => toggleCoachItem(item.id, checked)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </motion.div>

      {/* Benefits action items */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.12 }}
        style={card}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <p style={{ ...sectionLabel, marginBottom: 0 }}>Benefits action items</p>
          {benefits && benefitItems.length > 0 && (
            <p style={{
              fontFamily: 'var(--font-mono)', fontSize: '13px',
              color: benefitsDoneCount === benefitItems.length ? 'var(--color-positive)' : 'var(--color-text-mid)',
            }}>
              {benefitsDoneCount} / {benefitItems.length} complete
            </p>
          )}
        </div>

        {loading && (
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', color: 'var(--color-text-muted)' }}>Loading...</p>
        )}

        {!loading && !benefits && (
          <div style={{ padding: '8px 0' }}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', color: 'var(--color-text-muted)', marginBottom: '16px' }}>
              Upload your employment contract to generate benefit action items.
            </p>
            <Link href="/dashboard/benefits" style={{
              display: 'inline-block', padding: '10px 20px',
              backgroundColor: 'var(--color-gold)', color: 'var(--color-surface)',
              borderRadius: '2px', textDecoration: 'none',
              fontFamily: 'var(--font-mono)', fontSize: '13px', letterSpacing: '0.06em',
            }}>
              Analyze contract
            </Link>
          </div>
        )}

        {!loading && benefits && benefitItems.length === 0 && (
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', color: 'var(--color-positive)' }}>
            All benefits appear to be captured.
          </p>
        )}

        {!loading && benefits && benefitItems.length > 0 && (
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.04 } } }}
            style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
          >
            {benefitItems.map(item => {
              const isDone = benefitsDone.includes(item.label)
              const c = urgencyColors[item.urgency]
              return (
                <motion.div
                  key={item.label}
                  variants={{ hidden: { opacity: 0, x: -6 }, visible: { opacity: 1, x: 0, transition: { duration: 0.25 } } }}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: '12px',
                    padding: '14px 16px',
                    backgroundColor: isDone ? 'var(--color-positive-bg)' : c.bg,
                    border: `1px solid ${isDone ? 'var(--color-positive-border)' : c.border}`,
                    borderRadius: '2px',
                    transition: 'all 200ms ease',
                  }}
                >
                  <Checkbox
                    checked={isDone}
                    color={c.dot}
                    onClick={() => toggleBenefitItem(item.label, !isDone)}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                      <span style={{
                        fontFamily: 'var(--font-mono)', fontSize: '14px', fontWeight: 500,
                        color: isDone ? 'var(--color-text-muted)' : 'var(--color-text)',
                        textDecoration: isDone ? 'line-through' : 'none',
                        transition: 'all 200ms ease',
                      }}>
                        {item.label}
                      </span>
                      {item.annualValue && (
                        <span style={{
                          fontFamily: 'var(--font-serif)', fontSize: '14px',
                          color: isDone ? 'var(--color-text-muted)' : 'var(--color-text-mid)', fontWeight: 300,
                        }}>
                          {fmt(item.annualValue)}/yr
                        </span>
                      )}
                      <span style={{
                        fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.1em',
                        textTransform: 'uppercase', color: c.dot, opacity: isDone ? 0.4 : 1,
                      }}>
                        {item.urgency}
                      </span>
                    </div>
                    <p style={{
                      fontFamily: 'var(--font-mono)', fontSize: '13px', lineHeight: 1.6,
                      color: isDone ? 'var(--color-text-muted)' : 'var(--color-text-mid)',
                      textDecoration: isDone ? 'line-through' : 'none',
                      transition: 'all 200ms ease',
                    }}>
                      {item.action}
                    </p>
                  </div>
                </motion.div>
              )
            })}
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}
