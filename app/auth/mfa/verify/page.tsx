'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
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

type VerifyMethod = 'totp' | 'email'

export default function MFAVerifyPage() {
  const [verifyMethod, setVerifyMethod] = useState<VerifyMethod | null>(null)
  const [userEmail, setUserEmail]       = useState<string | null>(null)
  // TOTP-specific
  const [factorId, setFactorId]         = useState<string | null>(null)
  const [challengeId, setChallengeId]   = useState<string | null>(null)
  // shared
  const [code, setCode]                 = useState('')
  const [error, setError]               = useState<string | null>(null)
  const [loading, setLoading]           = useState(false)
  const [ready, setReady]               = useState(false)
  const router = useRouter()

  useEffect(() => {
    async function setup() {
      // If already at aal2, go straight to dashboard
      const { data: levelData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
      if (levelData && levelData.currentLevel === levelData.nextLevel) {
        router.push('/dashboard')
        return
      }

      // Get the current user's email for email OTP fallback
      const { data: userData } = await supabase.auth.getUser()
      const email = userData.user?.email ?? null
      setUserEmail(email)

      // Determine which method the user enrolled
      const { data: factorsData } = await supabase.auth.mfa.listFactors()
      const totpFactor = factorsData?.totp?.[0]

      if (totpFactor) {
        // TOTP user: create a challenge upfront
        const { data: challengeData, error: challengeErr } = await supabase.auth.mfa.challenge({
          factorId: totpFactor.id,
        })
        if (challengeErr || !challengeData) {
          setError(challengeErr?.message ?? 'Could not create challenge.')
          setReady(true)
          return
        }
        setFactorId(totpFactor.id)
        setChallengeId(challengeData.id)
        setVerifyMethod('totp')
      } else {
        // Email OTP user: send the code now
        if (email) {
          const { error: otpErr } = await supabase.auth.signInWithOtp({ email })
          if (otpErr) {
            setError(otpErr.message)
            setReady(true)
            return
          }
        }
        setVerifyMethod('email')
      }

      setReady(true)
    }

    setup()
  }, [router])

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      if (verifyMethod === 'totp') {
        if (!factorId || !challengeId) throw new Error('Missing factor or challenge.')
        const { error: err } = await supabase.auth.mfa.verify({ factorId, challengeId, code })
        if (err) { setError(err.message); return }
      } else {
        if (!userEmail) throw new Error('No email available.')
        const { error: err } = await supabase.auth.verifyOtp({
          email: userEmail,
          token: code,
          type: 'email',
        })
        if (err) { setError(err.message); return }
      }
      router.push('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const hint = verifyMethod === 'totp'
    ? 'Open your authenticator app and enter the 6-digit code for Illumin.'
    : `A verification code was sent to ${userEmail ?? 'your email'}. Enter it below.`

  return (
    <AuthLayout>
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
          Two-factor verification
        </p>
      </div>

      {!ready ? (
        <p style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '13px',
          color: 'var(--color-text-muted)',
          textAlign: 'center',
        }}>
          Loading...
        </p>
      ) : (
        <form onSubmit={handleVerify} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <p style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            color: 'var(--color-text-muted)',
            lineHeight: 1.6,
            margin: 0,
          }}>
            {hint}
          </p>

          <div>
            <label style={fieldLabel}>Verification code</label>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
              required
              placeholder="000000"
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
            {loading ? 'Verifying…' : 'Verify'}
          </button>
        </form>
      )}
    </AuthLayout>
  )
}
