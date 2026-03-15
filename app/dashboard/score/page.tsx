'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { ScoreReport, Finding } from '@/lib/scoring'

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

function urgencyColor(type: Finding['type']) {
  if (type === 'critical') return { bg: 'rgba(139,58,58,0.08)', border: 'rgba(139,58,58,0.2)', dot: '#8B3A3A', label: '#8B3A3A' }
  if (type === 'warning')  return { bg: 'rgba(184,145,58,0.06)', border: 'rgba(184,145,58,0.2)', dot: '#B8913A', label: '#B8913A' }
  return { bg: 'rgba(61,122,84,0.06)', border: 'rgba(61,122,84,0.2)', dot: '#3D7A54', label: '#3D7A54' }
}

function ScoreRing({ score }: { score: number }) {
  const r = 52
  const circ = 2 * Math.PI * r
  const dashOffset = circ * (1 - score / 100)
  return (
    <svg width="128" height="128" viewBox="0 0 128 128" style={{ transform: 'rotate(-90deg)' }}>
      <circle cx="64" cy="64" r={r} fill="none" stroke="rgba(184,145,58,0.1)" strokeWidth="8" />
      <circle
        cx="64" cy="64" r={r} fill="none"
        stroke="#B8913A" strokeWidth="8"
        strokeDasharray={circ}
        strokeDashoffset={dashOffset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 1s ease' }}
      />
    </svg>
  )
}

export default function ScorePage() {
  const [report, setReport]   = useState<ScoreReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) { setError('Sign in to view your score.'); setLoading(false); return }

      const res = await fetch('/api/user/score', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed to load score.'); setLoading(false); return }
      setReport(data.report)
      setLoading(false)
    })()
  }, [])

  const scoreLabel = !report ? '' : report.overallScore >= 80 ? 'Strong' : report.overallScore >= 60 ? 'On Track' : report.overallScore >= 40 ? 'Needs Work' : 'At Risk'

  return (
    <div style={{ padding: '40px 48px', maxWidth: '900px' }}>

      {/* Header */}
      <div style={{ marginBottom: '36px' }}>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: '#B8913A', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '10px' }}>
          Financial Score
        </p>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '28px', fontWeight: 400, color: '#1A1A1A', marginBottom: '8px' }}>
          Your Score Report
        </h1>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: '#8A95A3', lineHeight: 1.6 }}>
          A composite view of your financial health across benefits utilization, savings behavior, and retirement planning.
        </p>
      </div>

      {loading && (
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: '#8A95A3' }}>Loading…</p>
      )}

      {error && (
        <div style={{ backgroundColor: 'rgba(139,58,58,0.06)', border: '1px solid rgba(139,58,58,0.2)', borderRadius: '6px', padding: '16px 20px' }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: '#8B3A3A' }}>{error}</p>
        </div>
      )}

      {report && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>

          {/* Score overview */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '40px',
            backgroundColor: 'rgba(184,145,58,0.04)',
            border: '1px solid rgba(184,145,58,0.15)',
            borderRadius: '8px',
            padding: '32px 36px',
            marginBottom: '32px',
          }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <ScoreRing score={report.overallScore} />
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontFamily: 'var(--font-serif)', fontSize: '28px', fontWeight: 300, color: '#1A1A1A' }}>{report.overallScore}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: '#B8913A', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{scoreLabel}</span>
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {report.dimensions.map(d => (
                  <div key={d.name}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#4A5568' }}>{d.name}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#1A1A1A' }}>{d.score}</span>
                    </div>
                    <div style={{ height: '4px', backgroundColor: 'rgba(0,0,0,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${d.score}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
                        style={{ height: '100%', backgroundColor: '#B8913A', borderRadius: '2px' }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Findings */}
          {report.findings.length > 0 ? (
            <>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: '#8A95A3', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '16px' }}>
                Action items ({report.findings.length})
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '32px' }}>
                {report.findings.map((f, i) => {
                  const c = urgencyColor(f.type)
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.06, duration: 0.3 }}
                      style={{
                        backgroundColor: c.bg,
                        border: `1px solid ${c.border}`,
                        borderRadius: '6px',
                        padding: '16px 20px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: c.dot, flexShrink: 0 }} />
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: '#1A1A1A', fontWeight: 500 }}>{f.title}</span>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: c.label, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{f.type}</span>
                          </div>
                          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#4A5568', lineHeight: 1.6, paddingLeft: '14px' }}>{f.description}</p>
                        </div>
                        {f.dollarImpact > 0 && (
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <p style={{ fontFamily: 'var(--font-serif)', fontSize: '18px', fontWeight: 300, color: '#1A1A1A' }}>{fmt(f.dollarImpact)}</p>
                            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: '#8A95A3' }}>per year</p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </>
          ) : (
            <div style={{ backgroundColor: 'rgba(61,122,84,0.06)', border: '1px solid rgba(61,122,84,0.2)', borderRadius: '6px', padding: '20px 24px', marginBottom: '32px' }}>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: '#3D7A54' }}>No critical findings. Upload your employment contract to unlock a full benefits analysis.</p>
            </div>
          )}

          {/* CTA to upload */}
          {!report.dimensions.find(d => d.name === 'Benefits Utilization') && (
            <Link href="/dashboard/benefits" style={{
              display: 'inline-block',
              padding: '12px 24px',
              backgroundColor: '#B8913A',
              color: '#0D1018',
              borderRadius: '4px',
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              textDecoration: 'none',
              letterSpacing: '0.06em',
            }}>
              Upload contract to complete analysis →
            </Link>
          )}

          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: '#8A95A3', marginTop: '28px' }}>
            Generated {new Date(report.generatedAt).toLocaleString()}
          </p>
        </motion.div>
      )}
    </div>
  )
}
