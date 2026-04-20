'use client'

import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import type { OnboardingData } from './shared'
import { heading, body, continueBtn } from './shared'
import { useUploadBenefitsMutation } from '@/lib/queries'

interface Props {
  data: OnboardingData
  onChange: (patch: Partial<OnboardingData>) => void
  onAdvance: () => void
}

// Wires into the existing /api/user/benefits/extract route, which uploads a
// PDF to Claude for structured JSON extraction and writes the result to the
// EmploymentBenefits table. After a successful parse we ALSO stash the same
// JSON on the OnboardingProfile (contract_parsed_data / contract_uploaded_at)
// so Step 4 can pre-fill.
export function Step3Contract({ data, onChange, onAdvance }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const upload = useUploadBenefitsMutation()
  const [state, setState] = useState<'idle' | 'uploading' | 'done' | 'error'>(
    data.contractParsedData ? 'done' : 'idle'
  )
  const [error, setError] = useState<string | null>(null)

  const handleFile = async (file: File) => {
    setState('uploading')
    setError(null)
    try {
      const fd = new FormData()
      fd.append('contract', file)
      const result = await upload.mutateAsync(fd)
      onChange({
        contractParsedData: (result?.extracted ?? result?.benefits ?? {}) as Record<string, unknown>,
        contractUploadedAt: new Date().toISOString(),
      })
      setState('done')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not parse the document.'
      setError(msg)
      setState('error')
    }
  }

  return (
    <div>
      <h1 style={heading}>Upload your contract</h1>
      <p style={body}>Offer letter or benefits summary.</p>

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        style={{ display: 'none' }}
        onChange={e => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
        }}
      />

      <div
        style={{
          marginTop: '36px',
          padding: '40px 24px',
          border: '1px dashed var(--color-border-strong)',
          borderRadius: '4px',
          backgroundColor: 'var(--color-gold-subtle)',
          textAlign: 'center',
        }}
      >
        {state === 'done' ? (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div
              style={{
                margin: '0 auto 14px',
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                backgroundColor: 'var(--color-positive-bg)',
                border: '1px solid var(--color-positive-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-positive)',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <p
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '13px',
                color: 'var(--color-text)',
                letterSpacing: '0.04em',
                margin: 0,
              }}
            >
              Contract analyzed. We have pre-filled your benefits profile.
            </p>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              style={{
                marginTop: '14px',
                background: 'none',
                border: 'none',
                padding: 0,
                fontFamily: 'var(--font-mono)',
                fontSize: '10.5px',
                color: 'var(--color-text-muted)',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                cursor: 'pointer',
              }}
            >
              Replace document
            </button>
          </motion.div>
        ) : (
          <>
            <p
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                color: 'var(--color-text-muted)',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                margin: 0,
                marginBottom: '14px',
              }}
            >
              PDF, up to 10 MB
            </p>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={state === 'uploading'}
              style={{
                ...continueBtn,
                opacity: state === 'uploading' ? 0.65 : 1,
                cursor: state === 'uploading' ? 'not-allowed' : 'pointer',
              }}
            >
              {state === 'uploading' ? 'Analyzing…' : 'Choose a file'}
            </button>
            {error && (
              <p
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11.5px',
                  color: 'var(--color-negative)',
                  marginTop: '14px',
                }}
              >
                {error}
              </p>
            )}
          </>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '32px' }}>
        {state === 'done' ? (
          <button
            type="button"
            onClick={onAdvance}
            style={{ ...continueBtn, padding: '13px 36px' }}
          >
            Continue
          </button>
        ) : (
          <button
            type="button"
            onClick={onAdvance}
            style={{
              background: 'none',
              border: 'none',
              padding: '10px 22px',
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              color: 'var(--color-text-muted)',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            Skip this step
          </button>
        )}
      </div>
    </div>
  )
}
