'use client'

import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useDashboard } from '@/lib/dashboardData'
import { crossCheckBenefits, calcTotals } from '@/lib/benefitsAnalysis'
import type { BenefitStatus } from '@/lib/benefitsAnalysis'

// ── Shared style objects ──────────────────────────────────────────────────────

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

const fieldLabel: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '12px',
  color: 'var(--color-text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.14em',
  marginBottom: '6px',
  display: 'block',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  fontSize: '16px',
}

// ── Urgency color map ─────────────────────────────────────────────────────────

const urgencyColors: Record<BenefitStatus['urgency'], { dot: string; bg: string; border: string }> = {
  critical: { dot: 'var(--color-negative)',  bg: 'var(--color-negative-bg)',  border: 'var(--color-negative-border)' },
  high:     { dot: 'var(--color-gold)',       bg: 'var(--color-gold-subtle)', border: 'var(--color-gold-border)'      },
  medium:   { dot: 'var(--color-info)',       bg: 'var(--color-info-bg)',     border: 'var(--color-info-border)'      },
  info:     { dot: 'var(--color-text-muted)', bg: 'var(--color-surface-2)',   border: 'var(--color-border)'           },
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

function fmtIncome(n: number) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(n)
}

interface EditValues {
  age: number
  annualIncome: number
  savingsRate: number
  retirementAge: number
}

// ── Profile page ──────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { loading, email, authToken, profile, setProfile, benefits, setBenefits } = useDashboard()

  const [editing,    setEditing]   = useState(false)
  const [editValues, setEditValues] = useState<EditValues | null>(null)
  const [saving,     setSaving]    = useState(false)
  const [saveError,  setSaveError] = useState<string | null>(null)
  const [done,       setDone]      = useState<string[]>(benefits?.actionItemsDone ?? [])

  // Sync done list when benefits load from context
  const actionItemsDone = benefits?.actionItemsDone ?? []
  const crossCheck = benefits?.extracted
    ? crossCheckBenefits(benefits.extracted)
    : (benefits?.crossCheck ?? [])

  const startEdit = () => {
    setEditValues(profile ?? { age: 0, annualIncome: 0, savingsRate: 0, retirementAge: 65 })
    setSaveError(null)
    setEditing(true)
  }

  const handleSave = async () => {
    if (!editValues) return
    setSaving(true)
    setSaveError(null)
    try {
      const res = await fetch('/api/user/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({
          age:           Number(editValues.age),
          annualIncome:  Number(editValues.annualIncome),
          savingsRate:   Number(editValues.savingsRate),
          retirementAge: Number(editValues.retirementAge),
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        setSaveError(data.error ?? 'Save failed')
      } else {
        const { profile: saved } = await res.json()
        setProfile(saved)
        setEditing(false)
      }
    } catch {
      setSaveError('Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const toggleItem = useCallback(async (itemLabel: string, checked: boolean) => {
    const next = checked ? [...done, itemLabel] : done.filter(l => l !== itemLabel)
    setDone(next)
    if (benefits) setBenefits({ ...benefits, actionItemsDone: next })
    if (!authToken) return
    await fetch('/api/user/benefits/actions', {
      method:  'PATCH',
      headers: { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' },
      body:    JSON.stringify({ label: itemLabel, done: checked }),
    })
  }, [done, benefits, setBenefits, authToken])

  const initials    = email ? email.slice(0, 2).toUpperCase() : ''
  const hasBenefits = !!benefits
  const actionItems = crossCheck.filter(s => s.urgency !== 'info')
  const completedCount = actionItems.filter(s => (done.length ? done : actionItemsDone).includes(s.label)).length
  const totals = benefits?.extracted ? calcTotals(benefits.extracted) : null
  const activeDone = done.length ? done : actionItemsDone

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Profile header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        style={{ ...card, display: 'flex', alignItems: 'center', gap: '24px' }}
      >
        <div style={{
          width: '52px', height: '52px', borderRadius: '50%',
          backgroundColor: 'var(--color-gold-subtle)',
          border: '1px solid var(--color-gold-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--font-mono)', fontSize: '17px', color: 'var(--color-gold)',
          letterSpacing: '0.05em', flexShrink: 0,
        }}>
          {initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            fontFamily: 'var(--font-serif)', fontSize: '24px', fontWeight: 400,
            color: 'var(--color-text)', marginBottom: '4px',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {email ?? 'Your Profile'}
          </p>
          {totals && (
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--color-text-mid)' }}>
              Contract value {fmt(totals.totalContractValue)}/yr &middot; {fmt(totals.totalBenefitsValue)}/yr in benefits
            </p>
          )}
        </div>
      </motion.div>

      {/* Financial profile */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.06 }}
        style={card}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <p style={{ ...sectionLabel, marginBottom: 0 }}>Financial profile</p>
          {!editing && (
            <button
              onClick={startEdit}
              style={{
                fontFamily: 'var(--font-mono)', fontSize: '12px', letterSpacing: '0.1em',
                textTransform: 'uppercase', color: 'var(--color-gold)', background: 'none',
                border: '1px solid var(--color-gold-border)', borderRadius: '2px',
                padding: '5px 12px', cursor: 'pointer',
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--color-gold)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--color-gold-border)')}
            >
              Edit
            </button>
          )}
        </div>

        {loading ? (
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', color: 'var(--color-text-muted)' }}>Loading...</p>
        ) : !editing ? (
          profile ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
              {[
                { label: 'Age',            value: `${profile.age} years old`            },
                { label: 'Annual income',  value: `$${fmtIncome(profile.annualIncome)}`  },
                { label: 'Savings rate',   value: `${profile.savingsRate}%`              },
                { label: 'Retirement age', value: `${profile.retirementAge} years old`   },
              ].map(({ label: lbl, value }) => (
                <div key={lbl}>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: '4px' }}>
                    {lbl}
                  </p>
                  <p style={{ fontFamily: 'var(--font-serif)', fontSize: '26px', fontWeight: 400, color: 'var(--color-text)' }}>
                    {value}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: '8px 0' }}>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', color: 'var(--color-text-muted)', marginBottom: '16px' }}>
                No profile data yet. Complete the onboarding flow to set your financial baseline.
              </p>
              <Link href="/onboarding" style={{
                display: 'inline-block', padding: '10px 20px',
                backgroundColor: 'var(--color-gold)', color: 'var(--color-surface)',
                borderRadius: '2px', textDecoration: 'none',
                fontFamily: 'var(--font-mono)', fontSize: '13px', letterSpacing: '0.06em',
              }}>
                Complete onboarding
              </Link>
            </div>
          )
        ) : (
          editValues && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <label style={fieldLabel}>Age</label>
                  <input type="number" value={editValues.age} min={16} max={80}
                    onChange={e => setEditValues(v => v ? { ...v, age: Number(e.target.value) } : v)}
                    style={inputStyle} />
                </div>
                <div>
                  <label style={fieldLabel}>Annual income ($)</label>
                  <input type="number" value={editValues.annualIncome} min={0}
                    onChange={e => setEditValues(v => v ? { ...v, annualIncome: Number(e.target.value) } : v)}
                    style={inputStyle} />
                </div>
                <div>
                  <label style={fieldLabel}>Savings rate (%)</label>
                  <input type="number" value={editValues.savingsRate} min={0} max={100}
                    onChange={e => setEditValues(v => v ? { ...v, savingsRate: Number(e.target.value) } : v)}
                    style={inputStyle} />
                </div>
                <div>
                  <label style={fieldLabel}>Target retirement age</label>
                  <input type="number" value={editValues.retirementAge} min={45} max={80}
                    onChange={e => setEditValues(v => v ? { ...v, retirementAge: Number(e.target.value) } : v)}
                    style={inputStyle} />
                </div>
              </div>
              {saveError && (
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--color-negative)', marginBottom: '14px' }}>
                  {saveError}
                </p>
              )}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={handleSave} disabled={saving} style={{
                  padding: '10px 24px', backgroundColor: 'var(--color-gold)', border: 'none',
                  borderRadius: '2px', color: 'var(--color-surface)', fontFamily: 'var(--font-mono)',
                  fontSize: '13px', letterSpacing: '0.08em', textTransform: 'uppercase',
                  cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.65 : 1,
                }}>
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button onClick={() => { setEditing(false); setSaveError(null) }} disabled={saving} style={{
                  padding: '10px 18px', backgroundColor: 'transparent',
                  border: '1px solid var(--color-border)', borderRadius: '2px',
                  color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)',
                  fontSize: '13px', letterSpacing: '0.08em', cursor: 'pointer',
                }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-text)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-muted)')}
                >
                  Cancel
                </button>
              </div>
            </div>
          )
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
          {hasBenefits && actionItems.length > 0 && (
            <p style={{
              fontFamily: 'var(--font-mono)', fontSize: '13px',
              color: completedCount === actionItems.length ? 'var(--color-positive)' : 'var(--color-text-mid)',
            }}>
              {completedCount} / {actionItems.length} complete
            </p>
          )}
        </div>

        {loading && (
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', color: 'var(--color-text-muted)' }}>Loading...</p>
        )}

        {!loading && !hasBenefits && (
          <div style={{ padding: '8px 0' }}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', color: 'var(--color-text-muted)', marginBottom: '16px' }}>
              Upload your employment contract to generate your personalized action checklist.
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

        {!loading && hasBenefits && actionItems.length === 0 && (
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', color: 'var(--color-positive)' }}>
            No action items. All benefits appear to be captured.
          </p>
        )}

        {!loading && hasBenefits && actionItems.length > 0 && (
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.04 } } }}
            style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
          >
            {actionItems.map((item) => {
              const isDone = activeDone.includes(item.label)
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
                  <div
                    onClick={() => toggleItem(item.label, !isDone)}
                    style={{
                      width: '16px', height: '16px', borderRadius: '2px', flexShrink: 0,
                      border: `1.5px solid ${isDone ? 'var(--color-positive)' : c.dot}`,
                      backgroundColor: isDone ? 'var(--color-positive)' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      marginTop: '1px', transition: 'all 150ms ease', cursor: 'pointer',
                    }}
                  >
                    {isDone && (
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                        <path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
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

      {/* Completion progress bar */}
      {!loading && hasBenefits && actionItems.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          style={{ ...card, padding: '20px 28px' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--color-text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              Completion
            </p>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--color-text-mid)' }}>
              {Math.round((completedCount / actionItems.length) * 100)}%
            </p>
          </div>
          <div style={{ height: '4px', backgroundColor: 'var(--color-gold-subtle)', borderRadius: '2px', overflow: 'hidden' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(completedCount / actionItems.length) * 100}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              style={{ height: '100%', backgroundColor: 'var(--color-gold)', borderRadius: '2px' }}
            />
          </div>
        </motion.div>
      )}
    </div>
  )
}
