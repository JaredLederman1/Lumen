'use client'

import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

interface BenefitRow {
  label: string
  value: string | null
  offered: boolean
}

interface ExtractionResult {
  has401k: boolean
  matchRate: number | null
  matchCap: number | null
  vestingYears: number | null
  hasHSA: boolean
  hsaEmployerContrib: number | null
  hasFSA: boolean
  fsaLimit: number | null
  hasRSUs: boolean
  hasESPP: boolean
  esppDiscount: number | null
  hasCommuterBenefits: boolean
  commuterMonthlyLimit: number | null
  tuitionReimbursement: number | null
  wellnessStipend: number | null
  totalAnnualValue: number | null
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

function buildRows(b: ExtractionResult): BenefitRow[] {
  return [
    {
      label: '401(k) Employer Match',
      offered: b.has401k,
      value: b.has401k && b.matchRate && b.matchCap
        ? `${(b.matchRate * 100).toFixed(0)}% match up to ${(b.matchCap * 100).toFixed(0)}% of salary${b.vestingYears ? ` · ${b.vestingYears}-yr vesting` : ''}`
        : null,
    },
    {
      label: 'HSA',
      offered: b.hasHSA,
      value: b.hasHSA && b.hsaEmployerContrib ? `${fmt(b.hsaEmployerContrib)} employer contribution/yr` : null,
    },
    {
      label: 'FSA',
      offered: b.hasFSA,
      value: b.hasFSA && b.fsaLimit ? `${fmt(b.fsaLimit)} annual limit` : null,
    },
    {
      label: 'RSUs',
      offered: b.hasRSUs,
      value: b.hasRSUs ? 'Offered' : null,
    },
    {
      label: 'ESPP',
      offered: b.hasESPP,
      value: b.hasESPP && b.esppDiscount ? `${(b.esppDiscount * 100).toFixed(0)}% discount` : null,
    },
    {
      label: 'Commuter Benefits',
      offered: b.hasCommuterBenefits,
      value: b.hasCommuterBenefits && b.commuterMonthlyLimit ? `${fmt(b.commuterMonthlyLimit)}/mo pre-tax` : null,
    },
    {
      label: 'Tuition Reimbursement',
      offered: Boolean(b.tuitionReimbursement),
      value: b.tuitionReimbursement ? `${fmt(b.tuitionReimbursement)}/yr` : null,
    },
    {
      label: 'Wellness Stipend',
      offered: Boolean(b.wellnessStipend),
      value: b.wellnessStipend ? `${fmt(b.wellnessStipend)}/yr` : null,
    },
  ]
}

export default function BenefitsPage() {
  const [dragging, setDragging]     = useState(false)
  const [file, setFile]             = useState<File | null>(null)
  const [uploading, setUploading]   = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const [result, setResult]         = useState<ExtractionResult | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = (f: File) => {
    if (f.type !== 'application/pdf') { setError('Please upload a PDF file.'); return }
    if (f.size > 20 * 1024 * 1024)    { setError('File must be under 20MB.');  return }
    setError(null)
    setFile(f)
    setResult(null)
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }, [])

  const analyze = async () => {
    if (!file) return
    setUploading(true)
    setError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) { setError('You must be signed in to analyze a contract.'); return }

      const form = new FormData()
      form.append('contract', file)

      const res = await fetch('/api/user/benefits/extract', {
        method:  'POST',
        headers: { Authorization: `Bearer ${token}` },
        body:    form,
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Analysis failed.'); return }
      setResult(data.benefits)
    } catch {
      setError('Unexpected error. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const rows = result ? buildRows(result) : []
  const offeredCount = rows.filter(r => r.offered).length
  const notOfferedCount = rows.filter(r => !r.offered).length

  return (
    <div style={{ padding: '40px 48px', maxWidth: '900px' }}>

      {/* Header */}
      <div style={{ marginBottom: '36px' }}>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: '#B8913A', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '10px' }}>
          Benefits
        </p>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '28px', fontWeight: 400, color: '#1A1A1A', marginBottom: '8px' }}>
          Employment Contract Analyzer
        </h1>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: '#8A95A3', lineHeight: 1.6 }}>
          Upload your offer letter or benefits summary. Illumin extracts every benefit, quantifies its dollar value, and surfaces what you&apos;re likely leaving on the table.
        </p>
      </div>

      {/* Upload area */}
      <AnimatePresence mode="wait">
        {!result && (
          <motion.div
            key="upload"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
          >
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => inputRef.current?.click()}
              style={{
                border: `2px dashed ${dragging ? '#B8913A' : 'rgba(184,145,58,0.3)'}`,
                borderRadius: '8px',
                padding: '56px 40px',
                textAlign: 'center',
                cursor: 'pointer',
                backgroundColor: dragging ? 'rgba(184,145,58,0.04)' : 'transparent',
                transition: 'all 200ms ease',
                marginBottom: '24px',
              }}
            >
              <input
                ref={inputRef}
                type="file"
                accept="application/pdf"
                style={{ display: 'none' }}
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
              />
              <div style={{ fontSize: '32px', marginBottom: '12px', opacity: 0.4 }}>⬆</div>
              {file ? (
                <>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: '#1A1A1A', marginBottom: '4px' }}>{file.name}</p>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#8A95A3' }}>{(file.size / 1024).toFixed(0)} KB · PDF</p>
                </>
              ) : (
                <>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: '#4A5568', marginBottom: '4px' }}>Drop your PDF here or click to browse</p>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#8A95A3' }}>Offer letters, benefits summaries, employee handbooks · max 20MB</p>
                </>
              )}
            </div>

            {error && (
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: '#8B3A3A', marginBottom: '16px' }}>{error}</p>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <button
                onClick={analyze}
                disabled={!file || uploading}
                style={{
                  padding: '12px 28px',
                  backgroundColor: file && !uploading ? '#B8913A' : 'rgba(184,145,58,0.2)',
                  color: file && !uploading ? '#0D1018' : '#8A95A3',
                  border: 'none',
                  borderRadius: '4px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '12px',
                  letterSpacing: '0.06em',
                  cursor: file && !uploading ? 'pointer' : 'not-allowed',
                  transition: 'all 150ms ease',
                }}
              >
                {uploading ? 'Analyzing…' : 'Analyze contract'}
              </button>
              {uploading && (
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#8A95A3' }}>
                  Reading your document with Claude AI…
                </p>
              )}
            </div>

            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: '#8A95A3', marginTop: '20px', letterSpacing: '0.03em' }}>
              Your document is processed securely and never stored. Only extracted benefit data is saved to your profile.
            </p>
          </motion.div>
        )}

        {result && (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            {/* Total value card */}
            <div style={{
              backgroundColor: 'rgba(184,145,58,0.06)',
              border: '1px solid rgba(184,145,58,0.2)',
              borderRadius: '8px',
              padding: '28px 32px',
              marginBottom: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <div>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: '#B8913A', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Total annual benefit value
                </p>
                <p style={{ fontFamily: 'var(--font-serif)', fontSize: '36px', fontWeight: 300, color: '#1A1A1A' }}>
                  {result.totalAnnualValue ? fmt(result.totalAnnualValue) : '—'}
                </p>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#8A95A3', marginTop: '4px' }}>
                  {offeredCount} benefits offered · {notOfferedCount} not available
                </p>
              </div>
              <Link
                href="/dashboard/score"
                style={{
                  padding: '10px 20px',
                  border: '1px solid rgba(184,145,58,0.4)',
                  borderRadius: '4px',
                  color: '#B8913A',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  textDecoration: 'none',
                  letterSpacing: '0.06em',
                  transition: 'all 150ms ease',
                }}
              >
                View score report →
              </Link>
            </div>

            {/* Benefits grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px',
              marginBottom: '28px',
            }}>
              {rows.map((row, i) => (
                <motion.div
                  key={row.label}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.25 }}
                  style={{
                    backgroundColor: row.offered ? '#FFFFFF' : 'rgba(0,0,0,0.02)',
                    border: `1px solid ${row.offered ? 'rgba(184,145,58,0.15)' : 'rgba(0,0,0,0.06)'}`,
                    borderRadius: '6px',
                    padding: '16px 20px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <span style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      backgroundColor: row.offered ? '#3D7A54' : '#8A95A3',
                      flexShrink: 0,
                    }} />
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: row.offered ? '#1A1A1A' : '#8A95A3', fontWeight: row.offered ? 500 : 400 }}>
                      {row.label}
                    </p>
                  </div>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#8A95A3', paddingLeft: '14px' }}>
                    {row.value ?? 'Not offered'}
                  </p>
                </motion.div>
              ))}
            </div>

            {/* Gap summary */}
            <div style={{
              backgroundColor: 'rgba(139,58,58,0.04)',
              border: '1px solid rgba(139,58,58,0.15)',
              borderRadius: '6px',
              padding: '20px 24px',
              marginBottom: '24px',
            }}>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#8B3A3A', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px' }}>
                Likely uncaptured value
              </p>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: '#4A5568', lineHeight: 1.6 }}>
                Without confirmation of your current elections, we conservatively assume{' '}
                <strong style={{ color: '#1A1A1A' }}>none of these benefits are fully captured</strong>. Visit your score report to see the full breakdown of what to prioritize.
              </p>
            </div>

            <button
              onClick={() => { setFile(null); setResult(null) }}
              style={{
                padding: '10px 20px',
                border: '1px solid rgba(0,0,0,0.12)',
                borderRadius: '4px',
                backgroundColor: 'transparent',
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                color: '#8A95A3',
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
