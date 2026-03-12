'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
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

function getStrength(pwd: string): number {
  let score = 0
  if (pwd.length >= 8)             score++
  if (/[A-Z]/.test(pwd))           score++
  if (/[0-9]/.test(pwd))           score++
  if (/[^a-zA-Z0-9]/.test(pwd))   score++
  return score
}

function strengthColor(score: number): string {
  if (score <= 1) return 'var(--color-negative)'
  if (score <= 2) return 'var(--color-gold)'
  if (score <= 3) return 'var(--color-gold)'
  return 'var(--color-positive)'
}

export default function SignupPage() {
  const [name, setName]             = useState('')
  const [email, setEmail]           = useState('')
  const [password, setPassword]     = useState('')
  const [confirm, setConfirm]       = useState('')
  const [showPwd, setShowPwd]       = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const [loading, setLoading]       = useState(false)
  const router = useRouter()

  const strength = getStrength(password)

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    if (strength < 2) {
      setError('Password is too weak.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const { error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name } },
      })
      if (authError) {
        setError(authError.message)
      } else {
        router.push('/onboarding')
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

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
          Sovreign
        </div>
        <p style={{
          fontSize: '16px',
          color: 'var(--color-text)',
          fontFamily: 'var(--font-serif)',
          fontWeight: 300,
        }}>
          Create your account
        </p>
      </div>

      <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div>
          <label style={fieldLabel}>Name <span style={{ opacity: 0.5 }}>(optional)</span></label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            autoComplete="name"
            style={inputStyle}
          />
        </div>

        <div>
          <label style={fieldLabel}>Email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoComplete="email"
            style={inputStyle}
          />
        </div>

        <div>
          <label style={fieldLabel}>Password</label>
          <div style={{ position: 'relative' }}>
            <input
              type={showPwd ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              style={{ ...inputStyle, paddingRight: '52px' }}
            />
            <button
              type="button"
              onClick={() => setShowPwd(s => !s)}
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: 'var(--color-text-muted)',
                fontSize: '10px',
                fontFamily: 'var(--font-mono)',
                cursor: 'pointer',
                letterSpacing: '0.08em',
                padding: '2px 4px',
              }}
            >
              {showPwd ? 'HIDE' : 'SHOW'}
            </button>
          </div>
          {/* Strength bar */}
          {password.length > 0 && (
            <div style={{ display: 'flex', gap: '3px', marginTop: '8px' }}>
              {[0, 1, 2, 3].map(i => (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    height: '2px',
                    borderRadius: '1px',
                    backgroundColor: i < strength ? strengthColor(strength) : 'var(--color-border-strong)',
                    transition: 'background-color 200ms ease',
                  }}
                />
              ))}
            </div>
          )}
        </div>

        <div>
          <label style={fieldLabel}>Confirm Password</label>
          <div style={{ position: 'relative' }}>
            <input
              type={showConfirm ? 'text' : 'password'}
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              required
              autoComplete="new-password"
              style={{ ...inputStyle, paddingRight: '52px' }}
            />
            <button
              type="button"
              onClick={() => setShowConfirm(s => !s)}
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: 'var(--color-text-muted)',
                fontSize: '10px',
                fontFamily: 'var(--font-mono)',
                cursor: 'pointer',
                letterSpacing: '0.08em',
                padding: '2px 4px',
              }}
            >
              {showConfirm ? 'HIDE' : 'SHOW'}
            </button>
          </div>
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
          {loading ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <p style={{
        textAlign: 'center',
        marginTop: '28px',
        fontSize: '12px',
        color: 'var(--color-text-muted)',
        fontFamily: 'var(--font-mono)',
      }}>
        Already have an account?{' '}
        <Link href="/auth/login" style={{ color: 'var(--color-gold)', textDecoration: 'none' }}>
          Sign in
        </Link>
      </p>
    </AuthLayout>
  )
}
