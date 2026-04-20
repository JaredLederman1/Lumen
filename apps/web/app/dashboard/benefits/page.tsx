'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { useUploadBenefitsMutation } from '@/lib/queries'
import { calcTotals } from '@/lib/benefitsAnalysis'
import type { ExtractedBenefits, BenefitStatus } from '@/lib/benefitsAnalysis'
import { useIsMobile } from '@/hooks/useIsMobile'
import MobileCard from '@/components/ui/MobileCard'
import { colors, fonts, spacing } from '@/lib/theme'

interface AnalysisResult {
  extracted: ExtractedBenefits
  crossCheck: BenefitStatus[]
  totalContractValue: number
  totalBenefitsValue: number
  capturedAnnualValue: number
}

const LOADING_PHASES = [
  'Reading document structure...',
  'Extracting compensation terms...',
  'Identifying benefits and perks...',
  'Cross-checking your transaction history...',
  'Calculating opportunity cost...',
]

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
  marginBottom: '20px',
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

function StatusBadge({ captured }: { captured: boolean | null }) {
  if (captured === true)  return <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-positive)', backgroundColor: 'var(--color-positive-bg)', padding: '3px 7px', borderRadius: '2px' }}>Captured</span>
  if (captured === false) return <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-negative)', backgroundColor: 'var(--color-negative-bg)', padding: '3px 7px', borderRadius: '2px' }}>Not captured</span>
  return <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-text-muted)', backgroundColor: 'var(--color-gold-subtle)', padding: '3px 7px', borderRadius: '2px' }}>Unverified</span>
}

const urgencyDot: Record<BenefitStatus['urgency'], string> = {
  critical: 'var(--color-negative)',
  high:     'var(--color-gold)',
  medium:   'var(--color-info)',
  info:     'var(--color-text-muted)',
}

function BenefitsDesktop() {
  const upload = useUploadBenefitsMutation()
  const [dragging, setDragging]       = useState(false)
  const [file, setFile]               = useState<File | null>(null)
  const [uploading, setUploading]     = useState(false)
  const [error, setError]             = useState<string | null>(null)
  const [result, setResult]           = useState<AnalysisResult | null>(null)
  const [progress, setProgress]       = useState(0)
  const [loadingPhase, setLoadingPhase] = useState(0)
  const inputRef          = useRef<HTMLInputElement>(null)
  const progressRef       = useRef<ReturnType<typeof setInterval> | null>(null)
  const phaseRef          = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!uploading) return
    setProgress(0)
    setLoadingPhase(0)
    let current = 0
    progressRef.current = setInterval(() => {
      const increment = (88 - current) * 0.07 + Math.random() * 1.5
      current = Math.min(current + increment, 88)
      setProgress(current)
      if (current >= 88) clearInterval(progressRef.current!)
    }, 380)
    phaseRef.current = setInterval(() => {
      setLoadingPhase(p => Math.min(p + 1, LOADING_PHASES.length - 1))
    }, 2600)
    return () => {
      clearInterval(progressRef.current!)
      clearInterval(phaseRef.current!)
    }
  }, [uploading])

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
      const form = new FormData()
      form.append('contract', file)
      const data = await upload.mutateAsync(form)
      clearInterval(progressRef.current!)
      clearInterval(phaseRef.current!)
      setProgress(100)
      await new Promise(r => setTimeout(r, 480))
      setResult({
        extracted:           data.extracted,
        crossCheck:          data.crossCheck,
        totalContractValue:  data.totalContractValue,
        totalBenefitsValue:  data.totalBenefitsValue,
        capturedAnnualValue: data.capturedAnnualValue,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error. Please try again.')
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
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--color-gold)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '8px' }}>
          Benefits
        </p>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '31px', fontWeight: 400, color: 'var(--color-text)', marginBottom: '6px' }}>
          Employment Contract Analyzer
        </h1>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
          Upload your offer letter or benefits summary. Illumin extracts every element of your compensation, then cross-checks your transaction history to surface what you are likely leaving uncaptured.
        </p>
      </div>

      <AnimatePresence mode="wait">

        {/* Loading state */}
        {uploading && (
          <motion.div key="loading" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.3 }}>
            <div style={card}>
              <p style={sectionLabel}>Analyzing contract</p>
              <p style={{ fontFamily: 'var(--font-serif)', fontSize: '26px', fontWeight: 300, color: 'var(--color-text)', marginBottom: '28px' }}>
                {LOADING_PHASES[loadingPhase]}
              </p>
              <div style={{ height: '2px', backgroundColor: 'var(--color-gold-subtle)', borderRadius: '1px', marginBottom: '10px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${progress}%`, backgroundColor: 'var(--color-gold)', transition: 'width 360ms ease', borderRadius: '1px' }} />
              </div>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--color-text-muted)', letterSpacing: '0.08em' }}>
                {Math.round(progress)}%
              </p>
            </div>
          </motion.div>
        )}

        {/* Upload state */}
        {!result && !uploading && (
          <motion.div key="upload" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.3 }}>
            <div style={card}>
              <p style={sectionLabel}>Upload document</p>

              <div
                onDragOver={ev => { ev.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                onClick={() => inputRef.current?.click()}
                style={{
                  border: `1.5px dashed ${dragging ? 'var(--color-gold)' : 'var(--color-border-strong)'}`,
                  borderRadius: '2px',
                  padding: '48px 40px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  backgroundColor: dragging ? 'var(--color-gold-subtle)' : 'transparent',
                  transition: 'all 200ms ease',
                  marginBottom: '20px',
                }}
              >
                <input ref={inputRef} type="file" accept="application/pdf" style={{ display: 'none' }} onChange={ev => { const f = ev.target.files?.[0]; if (f) handleFile(f) }} />
                <div style={{ fontSize: '29px', marginBottom: '10px', opacity: 0.35, color: 'var(--color-text)' }}>⬆</div>
                {file ? (
                  <>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', color: 'var(--color-text)', marginBottom: '3px' }}>{file.name}</p>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--color-text-muted)' }}>{(file.size / 1024).toFixed(0)} KB · PDF</p>
                  </>
                ) : (
                  <>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', color: 'var(--color-text-mid)', marginBottom: '3px' }}>Drop your PDF here or click to browse</p>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--color-text-muted)' }}>Offer letters, benefits summaries, employee handbooks &middot; max 20MB</p>
                  </>
                )}
              </div>

              {error && <p style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--color-negative)', marginBottom: '14px' }}>{error}</p>}

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <button
                  onClick={analyze}
                  disabled={!file}
                  style={{ padding: '11px 26px', backgroundColor: file ? 'var(--color-gold)' : 'var(--color-gold-subtle)', color: file ? 'var(--color-text)' : 'var(--color-text-muted)', border: 'none', borderRadius: '2px', fontFamily: 'var(--font-mono)', fontSize: '13px', letterSpacing: '0.06em', cursor: file ? 'pointer' : 'not-allowed', transition: 'all 150ms ease' }}
                >
                  Analyze contract
                </button>
              </div>

              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '16px' }}>
                Your document is never stored. Only extracted benefit data is saved to your profile.
              </p>
            </div>
          </motion.div>
        )}

        {/* Results state */}
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
                  border: 'var(--color-gold-border)',
                },
                {
                  label: 'Total benefits value',
                  value: fmt(result.totalBenefitsValue) + '/yr',
                  sub: 'Excludes salary, bonus, equity',
                  border: 'var(--color-gold-border)',
                },
                {
                  label: 'Leaving on table',
                  value: uncaptured.length > 0 ? fmt(uncaptured.reduce((s, i) => s + (i.annualValue ?? 0), 0)) + '/yr' : 'None',
                  sub: `${uncaptured.length} uncaptured item${uncaptured.length !== 1 ? 's' : ''}`,
                  border: uncaptured.length > 0 ? 'var(--color-negative-border)' : 'var(--color-positive-border)',
                },
              ].map((stat, i) => (
                <motion.div key={stat.label} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07, duration: 0.3 }}
                  style={{ ...card, border: `1px solid ${stat.border}`, padding: '20px 24px' }}>
                  <p style={{ ...sectionLabel, marginBottom: '10px' }}>{stat.label}</p>
                  <p style={{ fontFamily: 'var(--font-serif)', fontSize: '26px', fontWeight: 300, color: 'var(--color-text)', marginBottom: '4px' }}>{stat.value}</p>
                  {stat.sub && <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--color-text-muted)' }}>{stat.sub}</p>}
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
                  e.hasStockOptions && e.stockOptionShares && {
                    label: `Stock options${e.stockOptionType ? ` (${e.stockOptionType})` : ''}`,
                    value: `${e.stockOptionShares.toLocaleString()} options`,
                    sub: [
                      `${e.stockOptionVestYears ?? 4}-yr vest`,
                      e.stockOptionCliffYears ? `${e.stockOptionCliffYears}-yr cliff` : null,
                      e.stockOptionStrikePrice ? `strike ${fmt(e.stockOptionStrikePrice)}` : null,
                    ].filter(Boolean).join(' · '),
                  },
                  e.hasRSUs && (e.rsuTotalShares || e.rsuGrantValue) && {
                    label: 'RSU grant',
                    value: e.rsuGrantValue ? fmt(e.rsuGrantValue) : `${e.rsuTotalShares!.toLocaleString()} shares`,
                    sub: `${e.rsuVestYears ?? 4}-yr vest${e.rsuCliffYears ? ` · ${e.rsuCliffYears}-yr cliff` : ''}`,
                  },
                  e.ptoDays && { label: 'PTO', value: `${e.ptoDays} days`, sub: 'annual' },
                  (e.paidSickLeaveUnlimited || e.paidSickLeaveDays) && {
                    label: 'Sick leave',
                    value: e.paidSickLeaveUnlimited ? 'Unlimited' : `${e.paidSickLeaveDays} days`,
                    sub: 'annual',
                  },
                  e.hasSeverance && e.severanceMonths && { label: 'Severance', value: `${e.severanceMonths} months`, sub: 'qualifying separation' },
                ].filter(Boolean).map((stat, i) => stat && (
                  <div key={stat.label}>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--color-text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '5px' }}>{stat.label}</p>
                    <p style={{ fontFamily: 'var(--font-serif)', fontSize: '22px', fontWeight: 300, color: 'var(--color-text)', marginBottom: '2px' }}>{stat.value}</p>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--color-text-muted)' }}>{stat.sub}</p>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Benefits utilization */}
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18, duration: 0.3 }} style={card}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <p style={{ ...sectionLabel, marginBottom: 0 }}>Benefits utilization</p>
                <Link href="/dashboard/profile" style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--color-gold)', textDecoration: 'none' }}>
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
                      backgroundColor: item.captured === false ? 'var(--color-negative-bg)' : item.captured === true ? 'var(--color-positive-bg)' : 'var(--color-gold-subtle)',
                      border: `1px solid ${item.captured === false ? 'var(--color-negative-border)' : item.captured === true ? 'var(--color-positive-border)' : 'var(--color-gold-border)'}`,
                      borderRadius: '2px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: item.urgency !== 'info' ? '8px' : '0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: urgencyDot[item.urgency], flexShrink: 0 }} />
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', color: 'var(--color-text)', fontWeight: 500 }}>{item.label}</span>
                        {item.annualValue && (
                          <span style={{ fontFamily: 'var(--font-serif)', fontSize: '16px', color: 'var(--color-text-mid)', fontWeight: 300 }}>{fmt(item.annualValue)}/yr</span>
                        )}
                      </div>
                      <StatusBadge captured={item.captured} />
                    </div>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--color-text-mid)', lineHeight: 1.6, paddingLeft: '14px', marginBottom: item.urgency !== 'info' && item.captured !== true ? '6px' : '0' }}>
                      {item.evidence}
                    </p>
                    {item.urgency !== 'info' && item.captured !== true && (
                      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--color-gold)', lineHeight: 1.6, paddingLeft: '14px' }}>
                        {item.action}
                      </p>
                    )}
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <button
              onClick={() => { setFile(null); setResult(null) }}
              style={{ alignSelf: 'flex-start', padding: '10px 20px', border: '1px solid var(--color-gold-border)', borderRadius: '2px', backgroundColor: 'transparent', fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--color-text-muted)', cursor: 'pointer' }}
            >
              Analyze another document
            </button>

          </motion.div>
        )}

      </AnimatePresence>
    </div>
  )
}

function BenefitsMobile() {
  const upload = useUploadBenefitsMutation()
  const [dragging, setDragging]         = useState(false)
  const [file, setFile]                 = useState<File | null>(null)
  const [uploading, setUploading]       = useState(false)
  const [error, setError]               = useState<string | null>(null)
  const [result, setResult]             = useState<AnalysisResult | null>(null)
  const [progress, setProgress]         = useState(0)
  const [loadingPhase, setLoadingPhase] = useState(0)
  const inputRef    = useRef<HTMLInputElement>(null)
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const phaseRef    = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!uploading) return
    setProgress(0)
    setLoadingPhase(0)
    let current = 0
    progressRef.current = setInterval(() => {
      const increment = (88 - current) * 0.07 + Math.random() * 1.5
      current = Math.min(current + increment, 88)
      setProgress(current)
      if (current >= 88) clearInterval(progressRef.current!)
    }, 380)
    phaseRef.current = setInterval(() => {
      setLoadingPhase(p => Math.min(p + 1, LOADING_PHASES.length - 1))
    }, 2600)
    return () => {
      clearInterval(progressRef.current!)
      clearInterval(phaseRef.current!)
    }
  }, [uploading])

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
      const form = new FormData()
      form.append('contract', file)
      const data = await upload.mutateAsync(form)
      clearInterval(progressRef.current!)
      clearInterval(phaseRef.current!)
      setProgress(100)
      await new Promise(r => setTimeout(r, 480))
      setResult({
        extracted:           data.extracted,
        crossCheck:          data.crossCheck,
        totalContractValue:  data.totalContractValue,
        totalBenefitsValue:  data.totalBenefitsValue,
        capturedAnnualValue: data.capturedAnnualValue,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const e = result?.extracted
  const crossCheck = result?.crossCheck ?? []
  const uncaptured = crossCheck.filter(s => s.captured === false && s.urgency !== 'info')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sectionGap, padding: `${spacing.cardPad}px ${spacing.pagePad}px` }}>

      {/* Header */}
      <div>
        <p style={{ fontFamily: fonts.mono, fontSize: 11, color: colors.gold, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 6 }}>
          Benefits
        </p>
        <h1 style={{ fontFamily: fonts.serif, fontSize: 26, fontWeight: 400, color: colors.text, marginBottom: 4 }}>
          Contract Analyzer
        </h1>
        <p style={{ fontFamily: fonts.mono, fontSize: 13, color: colors.textMuted, lineHeight: 1.6 }}>
          Upload your offer letter or benefits summary. Illumin extracts your compensation and surfaces what you may be leaving uncaptured.
        </p>
      </div>

      <AnimatePresence mode="wait">

        {/* Loading state */}
        {uploading && (
          <motion.div key="loading" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.3 }}>
            <MobileCard>
              <p style={{ fontFamily: fonts.mono, fontSize: 11, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.16em', marginBottom: 16 }}>Analyzing contract</p>
              <p style={{ fontFamily: fonts.serif, fontSize: 20, fontWeight: 300, color: colors.text, marginBottom: 20 }}>
                {LOADING_PHASES[loadingPhase]}
              </p>
              <div style={{ height: 2, backgroundColor: colors.goldSubtle, borderRadius: 1, marginBottom: 8, overflow: 'hidden' }}>
                <motion.div
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.36, ease: 'easeOut' }}
                  style={{ height: '100%', backgroundColor: colors.gold, borderRadius: 1 }}
                />
              </div>
              <p style={{ fontFamily: fonts.mono, fontSize: 12, color: colors.textMuted, letterSpacing: '0.08em' }}>
                {Math.round(progress)}%
              </p>
            </MobileCard>
          </motion.div>
        )}

        {/* Upload state */}
        {!result && !uploading && (
          <motion.div key="upload" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.3 }}>
            <MobileCard>
              <p style={{ fontFamily: fonts.mono, fontSize: 11, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.16em', marginBottom: 16 }}>Upload document</p>

              <div
                onDragOver={ev => { ev.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                onClick={() => inputRef.current?.click()}
                style={{
                  border: `1.5px dashed ${dragging ? colors.gold : colors.goldBorder}`,
                  borderRadius: 2,
                  padding: '24px 20px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  backgroundColor: dragging ? colors.goldSubtle : 'transparent',
                  marginBottom: 16,
                  minHeight: spacing.tapTarget,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                <input ref={inputRef} type="file" accept="application/pdf" style={{ display: 'none' }} onChange={ev => { const f = ev.target.files?.[0]; if (f) handleFile(f) }} />
                <div style={{ fontSize: 24, opacity: 0.35 }}>⬆</div>
                {file ? (
                  <>
                    <p style={{ fontFamily: fonts.mono, fontSize: 13, color: colors.text }}>{file.name}</p>
                    <p style={{ fontFamily: fonts.mono, fontSize: 12, color: colors.textMuted }}>{(file.size / 1024).toFixed(0)} KB · PDF</p>
                  </>
                ) : (
                  <>
                    <p style={{ fontFamily: fonts.mono, fontSize: 13, color: colors.textMuted }}>Tap to select a PDF</p>
                    <p style={{ fontFamily: fonts.mono, fontSize: 12, color: colors.textMuted }}>Offer letters, benefits summaries · max 20MB</p>
                  </>
                )}
              </div>

              {error && (
                <p style={{ fontFamily: fonts.mono, fontSize: 13, color: colors.negative, marginBottom: 12 }}>{error}</p>
              )}

              <button
                onClick={analyze}
                disabled={!file}
                style={{
                  width: '100%',
                  minHeight: spacing.tapTarget,
                  backgroundColor: file ? colors.gold : colors.goldSubtle,
                  color: file ? colors.surface : colors.textMuted,
                  border: 'none',
                  borderRadius: 2,
                  fontFamily: fonts.mono,
                  fontSize: 14,
                  letterSpacing: '0.06em',
                  cursor: file ? 'pointer' : 'not-allowed',
                }}
              >
                Analyze contract
              </button>

              <p style={{ fontFamily: fonts.mono, fontSize: 11, color: colors.textMuted, marginTop: 12 }}>
                Your document is never stored. Only extracted benefit data is saved to your profile.
              </p>
            </MobileCard>
          </motion.div>
        )}

        {/* Results state */}
        {result && e && (
          <motion.div key="results" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
            style={{ display: 'flex', flexDirection: 'column', gap: spacing.sectionGap }}>

            {/* Summary stats: stacked vertically */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sectionGap }}>
              {[
                {
                  label: 'Total contract value',
                  value: fmt(result.totalContractValue) + '/yr',
                  sub: e.baseSalary ? `${fmt(e.baseSalary)} salary + ${fmt(result.totalBenefitsValue)} benefits` : null,
                  borderColor: colors.goldBorder,
                },
                {
                  label: 'Total benefits value',
                  value: fmt(result.totalBenefitsValue) + '/yr',
                  sub: 'Excludes salary, bonus, equity',
                  borderColor: colors.goldBorder,
                },
                {
                  label: 'Leaving on table',
                  value: uncaptured.length > 0 ? fmt(uncaptured.reduce((s, i) => s + (i.annualValue ?? 0), 0)) + '/yr' : 'None',
                  sub: `${uncaptured.length} uncaptured item${uncaptured.length !== 1 ? 's' : ''}`,
                  borderColor: uncaptured.length > 0 ? colors.negativeBorder : colors.positiveBorder,
                },
              ].map((stat, i) => (
                <motion.div key={stat.label} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07, duration: 0.3 }}>
                  <MobileCard style={{ borderColor: stat.borderColor }}>
                    <p style={{ fontFamily: fonts.mono, fontSize: 11, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.16em', marginBottom: 8 }}>{stat.label}</p>
                    <p style={{ fontFamily: fonts.serif, fontSize: 24, fontWeight: 300, color: colors.text, marginBottom: 2 }}>{stat.value}</p>
                    {stat.sub && <p style={{ fontFamily: fonts.mono, fontSize: 12, color: colors.textMuted }}>{stat.sub}</p>}
                  </MobileCard>
                </motion.div>
              ))}
            </div>

            {/* Compensation overview: 2-column flex wrap */}
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12, duration: 0.3 }}>
              <MobileCard>
                <p style={{ fontFamily: fonts.mono, fontSize: 11, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.16em', marginBottom: 16 }}>Compensation overview</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
                  {[
                    e.baseSalary && { label: 'Base salary', value: fmt(e.baseSalary), sub: 'annual' },
                    e.annualBonusTargetPct && e.baseSalary && { label: 'Bonus target', value: fmt(e.baseSalary * e.annualBonusTargetPct), sub: `${(e.annualBonusTargetPct * 100).toFixed(0)}% of base` },
                    e.signingBonus && { label: 'Signing bonus', value: fmt(e.signingBonus), sub: 'one-time' },
                    e.hasStockOptions && e.stockOptionShares && {
                      label: `Stock options${e.stockOptionType ? ` (${e.stockOptionType})` : ''}`,
                      value: `${e.stockOptionShares.toLocaleString()} options`,
                      sub: [
                        `${e.stockOptionVestYears ?? 4}-yr vest`,
                        e.stockOptionCliffYears ? `${e.stockOptionCliffYears}-yr cliff` : null,
                        e.stockOptionStrikePrice ? `strike ${fmt(e.stockOptionStrikePrice)}` : null,
                      ].filter(Boolean).join(' · '),
                    },
                    e.hasRSUs && (e.rsuTotalShares || e.rsuGrantValue) && {
                      label: 'RSU grant',
                      value: e.rsuGrantValue ? fmt(e.rsuGrantValue) : `${e.rsuTotalShares!.toLocaleString()} shares`,
                      sub: `${e.rsuVestYears ?? 4}-yr vest${e.rsuCliffYears ? ` · ${e.rsuCliffYears}-yr cliff` : ''}`,
                    },
                    e.ptoDays && { label: 'PTO', value: `${e.ptoDays} days`, sub: 'annual' },
                    (e.paidSickLeaveUnlimited || e.paidSickLeaveDays) && {
                      label: 'Sick leave',
                      value: e.paidSickLeaveUnlimited ? 'Unlimited' : `${e.paidSickLeaveDays} days`,
                      sub: 'annual',
                    },
                    e.hasSeverance && e.severanceMonths && { label: 'Severance', value: `${e.severanceMonths} months`, sub: 'qualifying separation' },
                  ].filter(Boolean).map((stat, i) => stat && (
                    <div key={stat.label} style={{ width: 'calc(50% - 8px)' }}>
                      <p style={{ fontFamily: fonts.mono, fontSize: 11, color: colors.textMuted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>{stat.label}</p>
                      <p style={{ fontFamily: fonts.serif, fontSize: 20, fontWeight: 300, color: colors.text, marginBottom: 2 }}>{stat.value}</p>
                      <p style={{ fontFamily: fonts.mono, fontSize: 12, color: colors.textMuted }}>{stat.sub}</p>
                    </div>
                  ))}
                </div>
              </MobileCard>
            </motion.div>

            {/* Benefits utilization: unchanged, already mobile-friendly */}
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18, duration: 0.3 }}>
              <MobileCard>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <p style={{ fontFamily: fonts.mono, fontSize: 11, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.16em' }}>Benefits utilization</p>
                  <Link href="/dashboard/profile" style={{ fontFamily: fonts.mono, fontSize: 13, color: colors.gold, textDecoration: 'none' }}>
                    Checklist
                  </Link>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.tightGap }}>
                  {crossCheck.map((item, i) => (
                    <motion.div
                      key={item.label}
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 + i * 0.04, duration: 0.25 }}
                      style={{
                        padding: '14px 16px',
                        backgroundColor: item.captured === false ? 'var(--color-negative-bg)' : item.captured === true ? 'var(--color-positive-bg)' : 'var(--color-gold-subtle)',
                        border: `1px solid ${item.captured === false ? 'var(--color-negative-border)' : item.captured === true ? 'var(--color-positive-border)' : 'var(--color-gold-border)'}`,
                        borderRadius: 2,
                        minHeight: spacing.tapTarget,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: item.urgency !== 'info' ? 8 : 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', flex: 1 }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: urgencyDot[item.urgency], flexShrink: 0 }} />
                          <span style={{ fontFamily: fonts.mono, fontSize: 14, color: colors.text, fontWeight: 500 }}>{item.label}</span>
                          {item.annualValue && (
                            <span style={{ fontFamily: fonts.serif, fontSize: 14, color: colors.textMid, fontWeight: 300 }}>{fmt(item.annualValue)}/yr</span>
                          )}
                        </div>
                        <StatusBadge captured={item.captured} />
                      </div>
                      <p style={{ fontFamily: fonts.mono, fontSize: 12, color: colors.textMid, lineHeight: 1.6, paddingLeft: 14, marginBottom: item.urgency !== 'info' && item.captured !== true ? 6 : 0 }}>
                        {item.evidence}
                      </p>
                      {item.urgency !== 'info' && item.captured !== true && (
                        <p style={{ fontFamily: fonts.mono, fontSize: 12, color: colors.gold, lineHeight: 1.6, paddingLeft: 14 }}>
                          {item.action}
                        </p>
                      )}
                    </motion.div>
                  ))}
                </div>
              </MobileCard>
            </motion.div>

            <button
              onClick={() => { setFile(null); setResult(null) }}
              style={{
                width: '100%',
                minHeight: spacing.tapTarget,
                border: `1px solid ${colors.goldBorder}`,
                borderRadius: 2,
                backgroundColor: 'transparent',
                fontFamily: fonts.mono,
                fontSize: 13,
                color: colors.textMuted,
                cursor: 'pointer',
              }}
            >
              Analyze another document
            </button>

          </motion.div>
        )}

      </AnimatePresence>
    </div>
  )
}

export default function BenefitsPage() {
  const isMobile = useIsMobile()
  return isMobile ? <BenefitsMobile /> : <BenefitsDesktop />
}
