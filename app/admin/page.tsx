'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const row: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  paddingBottom: '16px',
  marginBottom: '16px',
  borderBottom: '1px solid var(--color-border)',
}

const label: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '10px',
  color: 'var(--color-text-muted)',
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
}

const value: React.CSSProperties = {
  fontFamily: 'var(--font-serif)',
  fontSize: '18px',
  fontWeight: 300,
  color: 'var(--color-text)',
}

export default function AdminPage() {
  const router = useRouter()
  const [adminEmail, setAdminEmail] = useState<string | null>(null)
  const [loading, setLoading]       = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.replace('/admin/login')
        return
      }
      setAdminEmail(data.session.user.email ?? null)
      setLoading(false)
    })
  }, [router])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/admin/login')
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: 'var(--color-bg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'var(--font-mono)',
        fontSize: '12px',
        color: 'var(--color-text-muted)',
        letterSpacing: '0.1em',
      }}>
        Loading…
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'var(--color-bg)',
      padding: '60px 48px',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '56px',
        paddingBottom: '28px',
        borderBottom: '1px solid var(--color-border)',
      }}>
        <div>
          <div style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '16px',
            fontWeight: 400,
            color: 'var(--color-gold)',
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            marginBottom: '6px',
          }}>
            Illumin
          </div>
          <p style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            color: 'var(--color-text-muted)',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
          }}>
            Admin portal
          </p>
        </div>
        <button
          onClick={handleSignOut}
          style={{
            padding: '9px 20px',
            backgroundColor: 'transparent',
            border: '1px solid var(--color-border-strong)',
            borderRadius: '2px',
            color: 'var(--color-text-muted)',
            fontSize: '10px',
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            cursor: 'pointer',
          }}
        >
          Sign out
        </button>
      </div>

      {/* Content */}
      <div style={{ maxWidth: '720px' }}>
        <h1 style={{
          fontFamily: 'var(--font-serif)',
          fontSize: '36px',
          fontWeight: 300,
          color: 'var(--color-text)',
          marginBottom: '40px',
          lineHeight: 1.2,
        }}>
          Admin dashboard
        </h1>

        {/* Session card */}
        <div style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: '2px',
          padding: '28px',
          marginBottom: '24px',
        }}>
          <p style={{ ...label, marginBottom: '20px' }}>Active session</p>
          <div style={row}>
            <span style={label}>Signed in as</span>
            <span style={value}>{adminEmail}</span>
          </div>
          <div style={{ ...row, borderBottom: 'none', paddingBottom: 0, marginBottom: 0 }}>
            <span style={label}>Role</span>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              color: 'var(--color-gold)',
              border: '1px solid var(--color-border-strong)',
              borderRadius: '2px',
              padding: '3px 10px',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}>
              Administrator
            </span>
          </div>
        </div>

        {/* Placeholder panels */}
        {[
          { title: 'Users', note: 'User management coming soon' },
          { title: 'Integrations', note: 'Akoya connection status and token management' },
          { title: 'System', note: 'Database health and environment status' },
        ].map(panel => (
          <div
            key={panel.title}
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '2px',
              padding: '24px 28px',
              marginBottom: '12px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '18px',
              fontWeight: 300,
              color: 'var(--color-text)',
            }}>
              {panel.title}
            </span>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              color: 'var(--color-text-muted)',
              letterSpacing: '0.04em',
            }}>
              {panel.note}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
