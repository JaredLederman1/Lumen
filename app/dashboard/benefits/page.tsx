'use client'

import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { calcTotals } from '@/lib/benefitsAnalysis'
import type { ExtractedBenefits, BenefitStatus } from '@/lib/benefitsAnalysis'

interface AnalysisResult {
  extracted: ExtractedBenefits
  crossCheck: BenefitStatus[]
  totalContractValue: number
  totalBenefitsValue: number
  capturedAnnualValue: number
}

const card: React.CSSProperties = {
  backgroundColor: '#FFFFFF',
  border: '1px solid rgba(184,145,58,0.15)',
  borderRadius: '2px',
  padding: '28px',
}

const sectionLabel: React.CSSProperties = {
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

function StatusBadge({ captured }: { captured: boolean | null }) {
  if (captured === true)  return <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#3D7A54', backgroundColor: 'rgba(61,122,84,0.08)', padding: '3px 7px', borderRadius: '2px' }}>Captured</span>
  if (captured === false) return <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8B3A3A', backgroundColor: 'rgba(139,58,58,0.08)', padding: '3px 7px', borderRadius: '2px' }}>Not captured</span>
  return <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8A95A3', backgroundColor: 'rgba(0,0,0,0.04)', padding: '3px 7px', borderRadius: '2px' }}>Unverified</span>
}

const urgencyDot: Record<BenefitStatus['urgency'], string> = {
  critical: '#8B3A3A',
  high:     '#B8913A',
  medium:   '#5A7A9A',
  info:     '#C4B8A8',
}

export default function BenefitsPage() {
  const [dragging, setDragging]   = useState(false)
  const [file, setFile]           = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [result, setResult]       = useState<AnalysisResult | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = (f: File) => {
    if (f.type !== 'application/pdf') { setError('Please upload a PDF file.'); return }
    if (f.size > 20 * 1024 * 1024)   { setError('File must be under 20MB.');  return }
    setError(null); setFile(f); setResult(null)
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    const f = e.dataTransfer.files[0]; if (f) handleFile(f)
  }, [])

  const analyze = async () => {
    if (!file) return
    setUploading(true); setError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) { setError('You must be signed in to analyze a contract.'); return }

      const form = new FormData()
      form.append('contract', file)

      const res  = await fetch('/api/user/benefits/extract', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Analysis failed.'); return }
      setResult({
        extracted:           data.extracted,
        crossCheck:          data.crossCheck,
        totalContractValue:  data.totalContractValue,
        totalBenefitsValue:  data.totalBenefitsValue,
        capturedAnnualValue: data.capturedAnnualValue,
      })
    } catch {
      setError('Unexpected error. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const e = result?.extracted
  const crossCheck = result?.crossCheck ?? []
  const uncaptured = crossCheck.filter(s => s.captured === false && s.urgency !== 'info')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Header */}
      <div>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: '#B8913A', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '8px' }}>
          Benefits
        </p>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '26px', fontWeight: 400, color: '#1A1A1A', marginBottom: '6px' }}>
          Employment Contract Analyzer
        </h1>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: '#8A95A3', lineHeight: 1.6 }}>
          Upload your offer letter or benefits summary. Illumin extracts every element of your compensation, then cross-checks your transaction history to surface what you are likely leaving uncaptured.
        </p>
      </div>

      <AnimatePresence mode="wait">

        {/* ── Upload state ─────────────────────────────────────────────────── */}
        {!result && (
          <motion.div key="upload" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.3 }}>
            <div style={card}>
              <p style={sectionLabel}>Upload document</p>

              <div
                onDragOver={ev => { ev.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                onClick={() => inputRef.current?.click()}
                style={{
                  border: `1.5px dashed ${dragging ? '#B8913A' : 'rgba(184,145,58,0.25)'}`,
                  borderRadius: '2px',
                  padding: '48px 40px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  backgroundColor: dragging ? 'rgba(184,145,58,0.03)' : 'transparent',
                  transition: 'all 200ms ease',
                  marginBottom: '20px',
                }}
              >
                <input ref={inputRef} type="file" accept="application/pdf" style={{ display: 'none' }} onChange={ev => { const f = ev.target.files?.[0]; if (f) handleFile(f) }} />
                <div style={{ fontSize: '24px', marginBottom: '10px', opacity: 0.35 }}>⬆</div>
                {file ? (
                  <>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: '#1A1A1A', marginBottom: '3px' }}>{file.name}</p>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#8A95A3' }}>{(file.size / 1024).toFixed(0)} KB · PDF</p>
                  </>
                ) : (
                  <>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: '#8A95A3', marginBottom: '3px' }}>Drop your PDF here or click to browse</p>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#C4B8A8' }}>Offer letters, benefits summaries, employee handbooks &middot; max 20MB</p>
                  </>
                )}
              </div>

              {error && <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#8B3A3A', marginBottom: '14px' }}>{error}</p>}

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <button
                  onClick={analyze}
                  disabled={!file || uploading}
                  style={{ padding: '11px 26px', backgroundColor: file && !uploading ? '#B8913A' : 'rgba(184,145,58,0.15)', color: file && !uploading ? '#FFFFFF' : '#A89880', border: 'none', borderRadius: '2px', fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.06em', cursor: file && !uploading ? 'pointer' : 'not-allowed', transition: 'all 150ms ease' }}
                >
                  {uploading ? 'Analyzing...' : 'Analyze contract'}
                </button>
                {uploading && <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#8A95A3' }}>Reading with Claude AI...</p>}
              </div>

              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: '#C4B8A8', marginTop: '16px' }}>
                Your document is never stored. Only extracted benefit data is saved to your profile.
              </p>
            </div>
          </motion.div>
        )}

        {/* ── Results state ────────────────────────────────────────────────── */}
        {result && e && (
          <motion.div key="results" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
            style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* Summary stats */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
              {[
                {
                  label: 'Total contract value',
                  value: fmt(result.totalContractValue) + '/yr',
                  sub: e.baseSalary ? `${fmt(e.baseSalary)} salary + ${fmt(result.totalBenefitsValue)} benefits` : null,
                  border: 'rgba(184,145,58,0.15)',
                },
                {
                  label: 'Total benefits value',
                  value: fmt(result.totalBenefitsValue) + '/yr',
                  sub: 'Excludes salary, bonus, equity',
                  border: 'rgba(184,145,58,0.15)',
                },
                {
                  label: 'Leaving on table',
                  value: uncaptured.length > 0 ? fmt(uncaptured.reduce((s, i) => s + (i.annualValue ?? 0), 0)) + '/yr' : 'None',
                  sub: `${uncaptured.length} uncaptured item${uncaptured.length !== 1 ? 's' : ''}`,
                  border: uncaptured.length > 0 ? 'rgba(139,58,58,0.2)' : 'rgba(61,122,84,0.2)',
                },
              ].map((stat, i) => (
                <motion.div key={stat.label} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07, duration: 0.3 }}
                  style={{ ...card, border: `1px solid ${stat.border}`, padding: '20px 24px' }}>
                  <p style={{ ...sectionLabel, marginBottom: '10px' }}>{stat.label}</p>
                  <p style={{ fontFamily: 'var(--font-serif)', fontSize: '22px', fontWeight: 300, color: '#1A1A1A', marginBottom: '4px' }}>{stat.value}</p>
                  {stat.sub && <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: '#8A95A3' }}>{stat.sub}</p>}
                </motion.div>
              ))}
            </div>

            {/* Compensation overview */}
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12, duration: 0.3 }} style={card}>
              <p style={sectionLabel}>Compensation overview</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '24px' }}>
                {[
                  e.baseSalary && { label: 'Base salary', value: fmt(e.baseSalary), sub: 'annual' },
                  e.annualBonusTargetPct && e.baseSalary && { label: 'Bonus target', value: fmt(e.baseSalary * e.annualBonusTargetPct), sub: `${(e.annualBonusTargetPct * 100).toFixed(0)}% of base` },
                  e.signingBonus && { label: 'Signing bonus', value: fmt(e.signingBonus), sub: 'one-time' },
                  e.hasRSUs && e.rsuTotalShares && { label: 'RSU grant', value: `${e.rsuTotalShares.toLocaleString()} shares`, sub: `${e.rsuVestYears ?? 4}-yr vest${e.rsuCliffYears ? ` · ${e.rsuCliffYears}-yr cliff` : ''}` },
                  e.ptoDays && { label: 'PTO', value: `${e.ptoDays} days`, sub: 'annual' },
                  e.hasSeverance && e.severanceMonths && { label: 'Severance', value: `${e.severanceMonths} months`, sub: 'qualifying separation' },
                ].filter(Boolean).map((stat, i) => stat && (
                  <div key={stat.label}>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: '#A89880', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '5px' }}>{stat.label}</p>
                    <p style={{ fontFamily: 'var(--font-serif)', fontSize: '18px', fontWeight: 300, color: '#1A1A1A', marginBottom: '2px' }}>{stat.value}</p>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: '#8A95A3' }}>{stat.sub}</p>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Benefits utilization */}
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18, duration: 0.3 }} style={card}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <p style={{ ...sectionLabel, marginBottom: 0 }}>Benefits utilization</p>
                <Link href="/dashboard/profile" style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#B8913A', textDecoration: 'none' }}>
                  View action checklist →
                </Link>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {crossCheck.map((item, i) => (
                  <motion.div
                    key={item.label}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 + i * 0.04, duration: 0.25 }}
                    style={{
                      padding: '14px 16px',
                      backgroundColor: item.captured === false ? 'rgba(139,58,58,0.03)' : item.captured === true ? 'rgba(61,122,84,0.03)' : 'rgba(0,0,0,0.015)',
                      border: `1px solid ${item.captured === false ? 'rgba(139,58,58,0.12)' : item.captured === true ? 'rgba(61,122,84,0.12)' : 'rgba(0,0,0,0.06)'}`,
                      borderRadius: '2px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: item.urgency !== 'info' ? '8px' : '0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: urgencyDot[item.urgency], flexShrink: 0 }} />
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: '#1A1A1A', fontWeight: 500 }}>{item.label}</span>
                        {item.annualValue && (
                          <span style={{ fontFamily: 'var(--font-serif)', fontSize: '13px', color: '#4A5568', fontWeight: 300 }}>{fmt(item.annualValue)}/yr</span>
                        )}
                      </div>
                      <StatusBadge captured={item.captured} />
                    </div>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#4A5568', lineHeight: 1.6, paddingLeft: '14px', marginBottom: item.urgency !== 'info' && item.captured !== true ? '6px' : '0' }}>
                      {item.evidence}
                    </p>
                    {item.urgency !== 'info' && item.captured !== true && (
                      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#B8913A', lineHeight: 1.6, paddingLeft: '14px' }}>
                        {item.action}
                      </p>
                    )}
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <button
              onClick={() => { setFile(null); setResult(null) }}
              style={{ alignSelf: 'flex-start', padding: '10px 20px', border: '1px solid rgba(184,145,58,0.2)', borderRadius: '2px', backgroundColor: 'transparent', fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#8A95A3', cursor: 'pointer' }}
            >
              Analyze another document
            </button>

          </motion.div>
        )}

      </AnimatePresence>
    </div>
  )
}
