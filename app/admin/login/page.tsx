'use client'

import { useState } from 'react'
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

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? ''

export default function AdminLoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [loading, setLoading]   = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })
      if (authError) {
        setError(authError.message)
        return
      }
      // Gate: only allow the designated admin email
      if (ADMIN_EMAIL && data.user?.email !== ADMIN_EMAIL) {
        await supabase.auth.signOut()
        setError('Access denied. This portal is for administrators only.')
        return
      }
      router.push('/admin')
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
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
          Sovereign
        </div>
        <p style={{
          fontSize: '12px',
          color: 'var(--color-text-muted)',
          fontFamily: 'var(--font-mono)',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
        }}>
          Admin portal
        </p>
      </div>

      <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
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
              autoComplete="current-password"
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
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </AuthLayout>
  )
}
