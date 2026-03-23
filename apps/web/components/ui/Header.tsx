'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useDashboard } from '@/lib/dashboardData'

const pageTitles: Record<string, string> = {
  '/dashboard':              'Overview',
  '/dashboard/accounts':     'Accounts',
  '/dashboard/transactions': 'Transactions',
  '/dashboard/cashflow':     'Cash Flow',
  '/dashboard/forecast':     'Forecast',
}

export default function Header() {
  const pathname = usePathname()
  const router = useRouter()
  const { refresh } = useDashboard()
  const title = pageTitles[pathname] ?? 'Illumin'
  const [isAdmin, setIsAdmin] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const email = data.session?.user?.email
      const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL
      setIsAdmin(!!email && !!adminEmail && email === adminEmail)
    })
  }, [])

  const handleSync = async () => {
    setSyncing(true)
    setSyncResult(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      }
      const res = await fetch('/api/plaid/sync', { method: 'POST', headers, redirect: 'error' })
      const contentType = res.headers.get('content-type') ?? ''
      if (!contentType.includes('application/json')) {
        const text = await res.text()
        console.error('[Sync] non-JSON response:', res.status, text.slice(0, 200))
        setSyncResult('Auth error, try refreshing')
        return
      }
      const data = await res.json()
      if (res.ok) {
        setSyncResult(`${data.updatedAccounts ?? 0} accts, ${data.updatedTransactions ?? 0} txns`)
        await refresh()
      } else {
        console.error('[Sync] API error:', res.status, data)
        setSyncResult(data.error ?? data.message ?? 'Sync failed')
      }
    } catch (err) {
      console.error('[Sync] error:', err)
      setSyncResult('Sync failed, check console')
    } finally {
      setSyncing(false)
      setTimeout(() => setSyncResult(null), 6000)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/admin/login')
  }

  return (
    <header style={{
      height: '60px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 36px',
      borderBottom: '1px solid rgba(184,145,58,0.18)',
      backgroundColor: '#0F1318',
      flexShrink: 0,
    }}>
      <h1 style={{
        fontFamily: 'var(--font-serif)',
        fontSize: '24px',
        fontWeight: 400,
        color: '#F0F2F8',
        margin: 0,
        letterSpacing: '0.01em',
      }}>
        {title}
      </h1>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <span style={{
          fontSize: '13px',
          color: '#6B7A8D',
          fontFamily: 'var(--font-mono)',
          letterSpacing: '0.04em',
        }}>
          {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })}
        </span>
        <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
          <button
            onClick={handleSync}
            disabled={syncing}
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              color: syncing ? '#B8913A' : '#6B7A8D',
              background: 'none',
              border: '1px solid rgba(184,145,58,0.25)',
              borderRadius: '2px',
              padding: '3px 10px',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              cursor: syncing ? 'not-allowed' : 'pointer',
              opacity: syncing ? 0.7 : 1,
              transition: 'color 150ms ease, border-color 150ms ease',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={e => {
              if (!syncing) {
                e.currentTarget.style.color = '#B8913A'
                e.currentTarget.style.borderColor = 'rgba(184,145,58,0.5)'
              }
            }}
            onMouseLeave={e => {
              if (!syncing) {
                e.currentTarget.style.color = '#6B7A8D'
                e.currentTarget.style.borderColor = 'rgba(184,145,58,0.25)'
              }
            }}
          >
            {syncing ? 'Syncing...' : 'Sync'}
          </button>
          {syncResult && (
            <span style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: '6px',
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              color: '#6B7A8D',
              backgroundColor: '#0F1318',
              border: '1px solid rgba(184,145,58,0.25)',
              borderRadius: '2px',
              padding: '4px 8px',
              whiteSpace: 'nowrap',
              zIndex: 20,
            }}>
              {syncResult}
            </span>
          )}
        </span>
        {isAdmin && (
          <>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              color: '#B8913A',
              border: '1px solid rgba(184,145,58,0.4)',
              borderRadius: '2px',
              padding: '3px 8px',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
            }}>
              Admin
            </span>
            <button
              onClick={handleSignOut}
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                color: '#6B7A8D',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                padding: '3px 0',
              }}
            >
              Sign out
            </button>
          </>
        )}
        <Link href="/dashboard/profile" style={{
          width: '30px',
          height: '30px',
          borderRadius: '50%',
          backgroundColor: 'rgba(184,145,58,0.10)',
          border: '1px solid rgba(184,145,58,0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'var(--font-mono)',
          fontSize: '12px',
          color: '#B8913A',
          textDecoration: 'none',
          cursor: 'pointer',
        }}>
          JL
        </Link>
      </div>
    </header>
  )
}
