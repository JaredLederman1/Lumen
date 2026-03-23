'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useDashboard } from '@/lib/dashboardData'
import { calcTotals } from '@/lib/benefitsAnalysis'
import { useIsMobile } from '@/hooks/useIsMobile'
import MobileCard from '@/components/ui/MobileCard'
import { colors, fonts, spacing } from '@/lib/theme'

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

function ProfileDesktop() {
  const { loading, email, authToken, profile, setProfile, benefits } = useDashboard()

  const [editing,    setEditing]   = useState(false)
  const [editValues, setEditValues] = useState<EditValues | null>(null)
  const [saving,     setSaving]    = useState(false)
  const [saveError,  setSaveError] = useState<string | null>(null)

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

  const initials = email ? email.slice(0, 2).toUpperCase() : ''
  const totals   = benefits?.extracted ? calcTotals(benefits.extracted) : null

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
                { label: 'Age',            value: `${profile.age} years old`           },
                { label: 'Annual income',  value: `$${fmtIncome(profile.annualIncome)}` },
                { label: 'Savings rate',   value: `${profile.savingsRate}%`             },
                { label: 'Retirement age', value: `${profile.retirementAge} years old`  },
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

      {/* Link to checklist */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.12 }}
        style={{ ...card, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
      >
        <div>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--color-text)', marginBottom: '4px' }}>
            Financial checklist
          </p>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--color-text-muted)' }}>
            Personalized action plan and benefits to-do items.
          </p>
        </div>
        <Link href="/dashboard/checklist" style={{
          padding: '8px 18px',
          border: '1px solid var(--color-gold-border)',
          borderRadius: '2px', textDecoration: 'none',
          fontFamily: 'var(--font-mono)', fontSize: '12px',
          letterSpacing: '0.08em', textTransform: 'uppercase',
          color: 'var(--color-gold)',
        }}>
          View
        </Link>
      </motion.div>
    </div>
  )
}

function ProfileMobile() {
  const { loading, email, authToken, profile, setProfile, benefits } = useDashboard()

  const [editing,    setEditing]   = useState(false)
  const [editValues, setEditValues] = useState<EditValues | null>(null)
  const [saving,     setSaving]    = useState(false)
  const [saveError,  setSaveError] = useState<string | null>(null)

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

  const initials = email ? email.slice(0, 2).toUpperCase() : ''
  const totals   = benefits?.extracted ? calcTotals(benefits.extracted) : null

  const mobileFieldLabel: React.CSSProperties = {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: '0.14em',
    marginBottom: 6,
    display: 'block',
  }

  const mobileInputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    fontSize: 16,
    boxSizing: 'border-box',
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      style={{ display: 'flex', flexDirection: 'column', gap: spacing.sectionGap }}
    >
      {/* Profile header */}
      <MobileCard>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            backgroundColor: colors.goldSubtle,
            border: `1px solid ${colors.goldBorder}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: fonts.mono,
            fontSize: 16,
            color: colors.gold,
            letterSpacing: '0.05em',
            flexShrink: 0,
          }}>
            {initials}
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{
              fontFamily: fonts.serif,
              fontSize: 20,
              fontWeight: 400,
              color: colors.text,
              marginBottom: 4,
            }}>
              {email ?? 'Your Profile'}
            </p>
            {totals && (
              <p style={{ fontFamily: fonts.mono, fontSize: 12, color: colors.textMid }}>
                Contract value {fmt(totals.totalContractValue)}/yr, {fmt(totals.totalBenefitsValue)}/yr in benefits
              </p>
            )}
          </div>
        </div>
      </MobileCard>

      {/* Financial profile */}
      <MobileCard>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <p style={{
            fontFamily: fonts.mono,
            fontSize: 10,
            color: colors.textMuted,
            textTransform: 'uppercase',
            letterSpacing: '0.16em',
          }}>
            Financial profile
          </p>
          {!editing && (
            <button
              onClick={startEdit}
              style={{
                fontFamily: fonts.mono,
                fontSize: 11,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: colors.gold,
                background: 'none',
                border: `1px solid ${colors.goldBorder}`,
                borderRadius: 2,
                padding: '5px 12px',
                cursor: 'pointer',
                minHeight: spacing.tapTarget,
              }}
            >
              Edit
            </button>
          )}
        </div>

        {loading ? (
          <p style={{ fontFamily: fonts.mono, fontSize: 14, color: colors.textMuted }}>Loading...</p>
        ) : !editing ? (
          profile ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
              {[
                { label: 'Age',            value: `${profile.age} years old`           },
                { label: 'Annual income',  value: `$${fmtIncome(profile.annualIncome)}` },
                { label: 'Savings rate',   value: `${profile.savingsRate}%`             },
                { label: 'Retirement age', value: `${profile.retirementAge} years old`  },
              ].map(({ label: lbl, value }) => (
                <div key={lbl} style={{ width: 'calc(50% - 8px)' }}>
                  <p style={{
                    fontFamily: fonts.mono,
                    fontSize: 10,
                    color: colors.textMuted,
                    textTransform: 'uppercase',
                    letterSpacing: '0.14em',
                    marginBottom: 4,
                  }}>
                    {lbl}
                  </p>
                  <p style={{
                    fontFamily: fonts.serif,
                    fontSize: 22,
                    fontWeight: 400,
                    color: colors.text,
                  }}>
                    {value}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: '8px 0' }}>
              <p style={{ fontFamily: fonts.mono, fontSize: 13, color: colors.textMuted, marginBottom: 16 }}>
                No profile data yet. Complete the onboarding flow to set your financial baseline.
              </p>
              <Link href="/onboarding" style={{
                display: 'block',
                textAlign: 'center',
                padding: '12px 20px',
                backgroundColor: colors.gold,
                color: 'var(--color-surface)',
                borderRadius: 2,
                textDecoration: 'none',
                fontFamily: fonts.mono,
                fontSize: 13,
                letterSpacing: '0.06em',
                minHeight: spacing.tapTarget,
                boxSizing: 'border-box',
              }}>
                Complete onboarding
              </Link>
            </div>
          )
        ) : (
          editValues && (
            <div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
                <div>
                  <label style={mobileFieldLabel}>Age</label>
                  <input type="number" value={editValues.age} min={16} max={80}
                    onChange={e => setEditValues(v => v ? { ...v, age: Number(e.target.value) } : v)}
                    style={mobileInputStyle} />
                </div>
                <div>
                  <label style={mobileFieldLabel}>Annual income ($)</label>
                  <input type="number" value={editValues.annualIncome} min={0}
                    onChange={e => setEditValues(v => v ? { ...v, annualIncome: Number(e.target.value) } : v)}
                    style={mobileInputStyle} />
                </div>
                <div>
                  <label style={mobileFieldLabel}>Savings rate (%)</label>
                  <input type="number" value={editValues.savingsRate} min={0} max={100}
                    onChange={e => setEditValues(v => v ? { ...v, savingsRate: Number(e.target.value) } : v)}
                    style={mobileInputStyle} />
                </div>
                <div>
                  <label style={mobileFieldLabel}>Target retirement age</label>
                  <input type="number" value={editValues.retirementAge} min={45} max={80}
                    onChange={e => setEditValues(v => v ? { ...v, retirementAge: Number(e.target.value) } : v)}
                    style={mobileInputStyle} />
                </div>
              </div>
              {saveError && (
                <p style={{ fontFamily: fonts.mono, fontSize: 13, color: 'var(--color-negative)', marginBottom: 14 }}>
                  {saveError}
                </p>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  style={{
                    width: '100%',
                    minHeight: spacing.tapTarget,
                    backgroundColor: colors.gold,
                    border: 'none',
                    borderRadius: 2,
                    color: 'var(--color-surface)',
                    fontFamily: fonts.mono,
                    fontSize: 13,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    opacity: saving ? 0.65 : 1,
                  }}
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={() => { setEditing(false); setSaveError(null) }}
                  disabled={saving}
                  style={{
                    width: '100%',
                    minHeight: spacing.tapTarget,
                    backgroundColor: 'transparent',
                    border: `1px solid ${colors.border}`,
                    borderRadius: 2,
                    color: colors.textMuted,
                    fontFamily: fonts.mono,
                    fontSize: 13,
                    letterSpacing: '0.08em',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )
        )}
      </MobileCard>

      {/* Checklist link card */}
      <MobileCard>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontFamily: fonts.mono, fontSize: 13, color: colors.text, marginBottom: 4 }}>
              Financial checklist
            </p>
            <p style={{ fontFamily: fonts.mono, fontSize: 12, color: colors.textMuted }}>
              Personalized action plan and benefits to-do items.
            </p>
          </div>
          <Link
            href="/dashboard/checklist"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '8px 18px',
              minHeight: spacing.tapTarget,
              border: `1px solid ${colors.goldBorder}`,
              borderRadius: 2,
              textDecoration: 'none',
              fontFamily: fonts.mono,
              fontSize: 12,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: colors.gold,
              whiteSpace: 'nowrap',
              flexShrink: 0,
              marginLeft: 12,
            }}
          >
            View
          </Link>
        </div>
      </MobileCard>
    </motion.div>
  )
}

export default function ProfilePage() {
  const isMobile = useIsMobile()
  return isMobile ? <ProfileMobile /> : <ProfileDesktop />
}
