'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import AuthLayout from '@/components/AuthLayout'

const fieldLabel: React.CSSProperties = {
  display: 'block',
  fontSize: '10px',
  color: 'var(--color-text-muted)',
  fontFamily: 'var(--font-mono)',
  textTransform: 'uppercase',
  letterSpacing: '0.14em',
  marginBottom: '8px',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '11px 14px',
  fontSize: '14px',
}

const primaryBtn = (loading: boolean): React.CSSProperties => ({
  width: '100%',
  padding: '13px',
  backgroundColor: 'var(--color-gold)',
  border: 'none',
  borderRadius: '2px',
  color: 'var(--color-surface)',
  fontSize: '12px',
  fontFamily: 'var(--font-mono)',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  fontWeight: 500,
  cursor: loading ? 'not-allowed' : 'pointer',
  opacity: loading ? 0.65 : 1,
  marginTop: '8px',
})

type Method = 'email' | 'totp'
type Stage = 'select' | 'code'

function MFAEnrollContent() {
  const searchParams = useSearchParams()
  const email = searchParams.get('email') ?? ''

  const [stage, setStage]       = useState<Stage>('select')
  const [method, setMethod]     = useState<Method | null>(null)
  // TOTP-specific
  const [factorId, setFactorId] = useState<string | null>(null)
  const [qrCode, setQrCode]     = useState<string | null>(null)
  const [secret, setSecret]     = useState<string | null>(null)
  // shared
  const [code, setCode]         = useState('')
  const [error, setError]       = useState<string | null>(null)
  const [loading, setLoading]   = useState(false)
  const router = useRouter()

  if (!email) {
    return (
      <div style={{ textAlign: 'center' }}>
        <p style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '13px',
          color: 'var(--color-negative)',
          marginBottom: '20px',
          lineHeight: 1.6,
        }}>
          Session error. Please sign up again.
        </p>
        <Link
          href="/auth/signup"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '12px',
            color: 'var(--color-gold)',
            textDecoration: 'none',
            letterSpacing: '0.06em',
          }}
        >
          Back to sign up
        </Link>
      </div>
    )
  }

  const handleSelectEmail = async () => {
    setError(null)
    setLoading(true)
    const { error: otpErr } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,
      },
    })
    setLoading(false)
    if (otpErr) {
      setError(otpErr.message)
      return
    }
    setMethod('email')
    setStage('code')
  }

  const handleSelectTotp = async () => {
    setError(null)
    setLoading(true)
    const { data, error: enrollErr } = await supabase.auth.mfa.enroll({ factorType: 'totp' })
    setLoading(false)
    if (enrollErr || !data) {
      setError(enrollErr?.message ?? 'Failed to start enrollment.')
      return
    }
    setFactorId(data.id)
    setQrCode(data.totp.qr_code)
    setSecret(data.totp.secret)
    setMethod('totp')
    setStage('code')
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      if (method === 'email') {
        const { error: err } = await supabase.auth.verifyOtp({
          email,
          token: code,
          type: 'email',
        })
        if (err) { setError(err.message); return }
      } else {
        if (!factorId) throw new Error('No factor ID.')
        const { error: err } = await supabase.auth.mfa.challengeAndVerify({ factorId, code })
        if (err) { setError(err.message); return }
      }
      router.push('/onboarding')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Wordmark */}
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <div style={{
          fontFamily: 'var(--font-serif)',
          fontSize: '18px',
          fontWeight: 400,
          color: 'var(--color-gold)',
          letterSpacing: '0.24em',
          textTransform: 'uppercase',
          marginBottom: '10px',
        }}>
          Illumin
        </div>
        <p style={{
          fontSize: '16px',
          color: 'var(--color-text)',
          fontFamily: 'var(--font-serif)',
          fontWeight: 300,
        }}>
          Set up two-factor authentication
        </p>
      </div>

      {stage === 'select' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <p style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            color: 'var(--color-text-muted)',
            lineHeight: 1.6,
            marginBottom: '8px',
          }}>
            Choose how you want to verify your identity each time you sign in.
          </p>

          {[
            {
              id: 'email' as Method,
              title: 'Email code',
              desc: "We'll send a code to your email",
              onClick: handleSelectEmail,
            },
            {
              id: 'totp' as Method,
              title: 'Authenticator app',
              desc: 'Use Google Authenticator or Authy',
              onClick: handleSelectTotp,
            },
          ].map(opt => (
            <button
              key={opt.id}
              type="button"
              onClick={opt.onClick}
              disabled={loading}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: '4px',
                padding: '16px',
                backgroundColor: 'transparent',
                border: '1px solid var(--color-border)',
                borderRadius: '2px',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
                textAlign: 'left',
                transition: 'border-color 120ms ease',
              }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.borderColor = 'var(--color-gold)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)' }}
            >
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '13px',
                color: 'var(--color-text)',
                letterSpacing: '0.04em',
              }}>
                {opt.title}
              </span>
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                color: 'var(--color-text-muted)',
              }}>
                {opt.desc}
              </span>
            </button>
          ))}

          {error && (
            <p style={{
              fontSize: '12px',
              color: 'var(--color-negative)',
              fontFamily: 'var(--font-mono)',
              margin: 0,
              lineHeight: 1.5,
            }}>
              {error}
            </p>
          )}
        </div>
      )}

      {stage === 'code' && (
        <>
          {method === 'totp' && qrCode && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', marginBottom: '28px' }}>
              <p style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                color: 'var(--color-text-muted)',
                textAlign: 'center',
                lineHeight: 1.6,
              }}>
                Scan this QR code with your authenticator app (Google Authenticator, Authy, or similar).
              </p>
              <img
                src={qrCode}
                alt="TOTP QR code"
                style={{
                  width: '180px',
                  height: '180px',
                  border: '1px solid var(--color-border)',
                  borderRadius: '2px',
                  padding: '8px',
                  backgroundColor: 'var(--color-surface)',
                }}
              />
              {secret && (
                <div style={{ width: '100%' }}>
                  <p style={{ ...fieldLabel, marginBottom: '6px' }}>Manual entry code</p>
                  <p style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '13px',
                    color: 'var(--color-text)',
                    letterSpacing: '0.12em',
                    padding: '10px 14px',
                    border: '1px solid var(--color-border)',
                    borderRadius: '2px',
                    wordBreak: 'break-all',
                    margin: 0,
                  }}>
                    {secret}
                  </p>
                </div>
              )}
            </div>
          )}

          {method === 'email' && (
            <p style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              color: 'var(--color-text-muted)',
              lineHeight: 1.6,
              marginBottom: '24px',
            }}>
              A verification code was sent to <span style={{ color: 'var(--color-text)' }}>{email}</span>. Enter it below.
            </p>
          )}

          <form onSubmit={handleVerify} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label style={fieldLabel}>Verification code</label>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={8}
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                required
                placeholder="00000000"
                autoFocus
                style={inputStyle}
              />
            </div>

            {error && (
              <p style={{
                fontSize: '12px',
                color: 'var(--color-negative)',
                fontFamily: 'var(--font-mono)',
                margin: 0,
                lineHeight: 1.5,
              }}>
                {error}
              </p>
            )}

            <button type="submit" disabled={loading} style={primaryBtn(loading)}>
              {loading ? 'Verifying…' : 'Activate'}
            </button>

            <button
              type="button"
              onClick={() => { setStage('select'); setCode(''); setError(null) }}
              style={{
                background: 'none',
                border: 'none',
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                color: 'var(--color-text-muted)',
                cursor: 'pointer',
                textAlign: 'center',
                letterSpacing: '0.06em',
              }}
            >
              Choose a different method
            </button>
          </form>
        </>
      )}
    </>
  )
}

export default function MFAEnrollPage() {
  return (
    <AuthLayout>
      <Suspense fallback={
        <p style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '12px',
          color: 'var(--color-text-muted)',
          textAlign: 'center',
        }}>
          Loading...
        </p>
      }>
        <MFAEnrollContent />
      </Suspense>
    </AuthLayout>
  )
}
