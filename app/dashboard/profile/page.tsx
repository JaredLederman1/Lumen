'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { crossCheckBenefits, calcTotals } from '@/lib/benefitsAnalysis'
import type { BenefitStatus, ExtractedBenefits } from '@/lib/benefitsAnalysis'

const card: React.CSSProperties = {
  backgroundColor: '#FFFFFF',
  border: '1px solid rgba(184,145,58,0.15)',
  borderRadius: '2px',
  padding: '28px',
}

const label: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '10px',
  color: '#A89880',
  textTransform: 'uppercase',
  letterSpacing: '0.16em',
  marginBottom: '20px',
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

const urgencyColors: Record<BenefitStatus['urgency'], { dot: string; bg: string; border: string }> = {
  critical: { dot: '#8B3A3A', bg: 'rgba(139,58,58,0.05)',  border: 'rgba(139,58,58,0.15)'  },
  high:     { dot: '#B8913A', bg: 'rgba(184,145,58,0.05)', border: 'rgba(184,145,58,0.15)' },
  medium:   { dot: '#5A7A9A', bg: 'rgba(90,122,154,0.05)', border: 'rgba(90,122,154,0.15)' },
  info:     { dot: '#A89880', bg: 'rgba(168,152,128,0.05)', border: 'rgba(168,152,128,0.15)' },
}

export default function ProfilePage() {
  const [email, setEmail]             = useState<string | null>(null)
  const [crossCheck, setCrossCheck]   = useState<BenefitStatus[]>([])
  const [extracted, setExtracted]     = useState<ExtractedBenefits | null>(null)
  const [done, setDone]               = useState<string[]>([])
  const [loading, setLoading]         = useState(true)
  const [hasBenefits, setHasBenefits] = useState(false)

  useEffect(() => {
    ;(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setEmail(session?.user?.email ?? null)
      const token = session?.access_token
      if (!token) { setLoading(false); return }

      const res = await fetch('/api/user/benefits', { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) {
        const data = await res.json()
        if (data.benefits) {
          setHasBenefits(true)
          setExtracted(data.extracted)
          setCrossCheck(data.crossCheck)
          setDone(data.actionItemsDone ?? [])
        }
      }
      setLoading(false)
    })()
  }, [])

  const toggleItem = useCallback(async (itemLabel: string, checked: boolean) => {
    // Optimistic update
    setDone(prev => checked ? [...prev, itemLabel] : prev.filter(l => l !== itemLabel))

    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token
    if (!token) return

    await fetch('/api/user/benefits/actions', {
      method:  'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body:    JSON.stringify({ label: itemLabel, done: checked }),
    })
  }, [])

  const initials = email ? email.slice(0, 2).toUpperCase() : 'JL'
  const actionItems = crossCheck.filter(s => s.urgency !== 'info')
  const completedCount = actionItems.filter(s => done.includes(s.label)).length
  const totals = extracted ? calcTotals(extracted) : null

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
          backgroundColor: 'rgba(184,145,58,0.08)', border: '1px solid rgba(184,145,58,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--font-mono)', fontSize: '14px', color: '#B8913A', letterSpacing: '0.05em', flexShrink: 0,
        }}>
          {initials}
        </div>
        <div>
          <p style={{ fontFamily: 'var(--font-serif)', fontSize: '20px', fontWeight: 400, color: '#1A1A1A', marginBottom: '4px' }}>
            {email ?? 'Your Profile'}
          </p>
          {totals && (
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#8A95A3' }}>
              Contract value {fmt(totals.totalContractValue)}/yr &middot; {fmt(totals.totalBenefitsValue)}/yr in benefits
            </p>
          )}
        </div>
      </motion.div>

      {/* Action items checklist */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.08 }}
        style={card}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <p style={{ ...label, marginBottom: 0 }}>Benefits action items</p>
          {hasBenefits && actionItems.length > 0 && (
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: completedCount === actionItems.length ? '#3D7A54' : '#8A95A3' }}>
              {completedCount} / {actionItems.length} complete
            </p>
          )}
        </div>

        {loading && (
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: '#8A95A3' }}>Loading...</p>
        )}

        {!loading && !hasBenefits && (
          <div style={{ padding: '24px 0', textAlign: 'center' }}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: '#8A95A3', marginBottom: '16px' }}>
              Upload your employment contract to generate your personalized action checklist.
            </p>
            <Link href="/dashboard/benefits" style={{
              display: 'inline-block', padding: '10px 20px',
              backgroundColor: '#B8913A', color: '#FFFFFF',
              borderRadius: '2px', textDecoration: 'none',
              fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.06em',
            }}>
              Analyze contract
            </Link>
          </div>
        )}

        {!loading && hasBenefits && actionItems.length === 0 && (
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: '#3D7A54' }}>
            No action items — all benefits appear to be captured.
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
              const isDone = done.includes(item.label)
              const c = urgencyColors[item.urgency]
              return (
                <motion.label
                  key={item.label}
                  variants={{ hidden: { opacity: 0, x: -6 }, visible: { opacity: 1, x: 0, transition: { duration: 0.25 } } }}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    padding: '14px 16px',
                    backgroundColor: isDone ? 'rgba(61,122,84,0.04)' : c.bg,
                    border: `1px solid ${isDone ? 'rgba(61,122,84,0.15)' : c.border}`,
                    borderRadius: '2px',
                    cursor: 'pointer',
                    transition: 'all 200ms ease',
                  }}
                >
                  {/* Checkbox */}
                  <div
                    onClick={() => toggleItem(item.label, !isDone)}
                    style={{
                      width: '16px', height: '16px', borderRadius: '2px', flexShrink: 0,
                      border: `1.5px solid ${isDone ? '#3D7A54' : c.dot}`,
                      backgroundColor: isDone ? '#3D7A54' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      marginTop: '1px', transition: 'all 150ms ease', cursor: 'pointer',
                    }}
                  >
                    {isDone && (
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                        <path d="M1 4l2.5 2.5L9 1" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{
                        fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 500,
                        color: isDone ? '#8A95A3' : '#1A1A1A',
                        textDecoration: isDone ? 'line-through' : 'none',
                        transition: 'all 200ms ease',
                      }}>
                        {item.label}
                      </span>
                      {item.annualValue && (
                        <span style={{ fontFamily: 'var(--font-serif)', fontSize: '12px', color: isDone ? '#8A95A3' : '#4A5568', fontWeight: 300 }}>
                          {fmt(item.annualValue)}/yr
                        </span>
                      )}
                      <span style={{
                        fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em',
                        textTransform: 'uppercase', color: c.dot,
                        opacity: isDone ? 0.4 : 1,
                      }}>
                        {item.urgency}
                      </span>
                    </div>
                    <p style={{
                      fontFamily: 'var(--font-mono)', fontSize: '11px', lineHeight: 1.6,
                      color: isDone ? '#A89880' : '#4A5568',
                      textDecoration: isDone ? 'line-through' : 'none',
                      transition: 'all 200ms ease',
                    }}>
                      {item.action}
                    </p>
                  </div>
                </motion.label>
              )
            })}
          </motion.div>
        )}
      </motion.div>

      {/* Progress bar if has items */}
      {!loading && hasBenefits && actionItems.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          style={{ ...card, padding: '20px 28px' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: '#A89880', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              Completion
            </p>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: '#4A5568' }}>
              {Math.round((completedCount / actionItems.length) * 100)}%
            </p>
          </div>
          <div style={{ height: '4px', backgroundColor: 'rgba(184,145,58,0.12)', borderRadius: '2px', overflow: 'hidden' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(completedCount / actionItems.length) * 100}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              style={{ height: '100%', backgroundColor: '#B8913A', borderRadius: '2px' }}
            />
          </div>
        </motion.div>
      )}

    </div>
  )
}
