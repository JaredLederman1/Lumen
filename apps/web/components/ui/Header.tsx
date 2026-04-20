'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { usePlaidSyncMutation } from '@/lib/queries'

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
  const title = pageTitles[pathname] ?? 'Illumin'
  const [isAdmin, setIsAdmin] = useState(false)
  const [syncResult, setSyncResult] = useState<string | null>(null)
  const sync = usePlaidSyncMutation()
  const syncing = sync.isPending

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const email = data.session?.user?.email
      const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL
      setIsAdmin(!!email && !!adminEmail && email === adminEmail)
    })
  }, [])

  const handleSync = () => {
    setSyncResult(null)
    sync.mutate(undefined, {
      onSuccess: data => {
        setSyncResult(`${data.updatedAccounts ?? 0} accts, ${data.updatedTransactions ?? 0} txns`)
        setTimeout(() => setSyncResult(null), 6000)
      },
      onError: err => {
        console.error('[Sync] error:', err)
        setSyncResult(err instanceof Error ? err.message : 'Sync failed')
        setTimeout(() => setSyncResult(null), 6000)
      },
    })
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
      borderBottom: '1px solid var(--color-border)',
      backgroundColor: 'var(--color-surface)',
      flexShrink: 0,
    }}>
      <h1 style={{
        fontFamily: 'var(--font-serif)',
        fontSize: '24px',
        fontWeight: 400,
        color: 'var(--color-text)',
        margin: 0,
        letterSpacing: '0.01em',
      }}>
        {title}
      </h1>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <span style={{
          fontSize: '13px',
          color: 'var(--color-text-muted)',
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
              fontFamily: 'var(--font-sans)',
              fontSize: '11px',
              fontWeight: 500,
              color: syncing ? 'var(--color-gold)' : 'var(--color-text-muted)',
              background: 'none',
              border: '1px solid var(--color-border-strong)',
              borderRadius: 'var(--radius-sm)',
              padding: '4px 12px',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              cursor: syncing ? 'not-allowed' : 'pointer',
              opacity: syncing ? 0.7 : 1,
              transition: 'color 150ms ease, border-color 150ms ease',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={e => {
              if (!syncing) {
                e.currentTarget.style.color = 'var(--color-gold)'
                e.currentTarget.style.borderColor = 'var(--color-border-hover)'
              }
            }}
            onMouseLeave={e => {
              if (!syncing) {
                e.currentTarget.style.color = 'var(--color-text-muted)'
                e.currentTarget.style.borderColor = 'var(--color-border-strong)'
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
              color: 'var(--color-text-muted)',
              backgroundColor: 'var(--color-surface-elevated)',
              border: '1px solid var(--color-border-strong)',
              borderRadius: 'var(--radius-sm)',
              padding: '4px 10px',
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
              fontFamily: 'var(--font-sans)',
              fontSize: '10px',
              fontWeight: 500,
              color: 'var(--color-gold)',
              border: '1px solid var(--color-border-strong)',
              borderRadius: 'var(--radius-pill)',
              padding: '3px 10px',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}>
              Admin
            </span>
            <button
              onClick={handleSignOut}
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: '11px',
                fontWeight: 500,
                color: 'var(--color-text-muted)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                letterSpacing: '0.06em',
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
          borderRadius: 'var(--radius-pill)',
          backgroundColor: 'var(--color-gold-subtle)',
          border: '1px solid var(--color-border-strong)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'var(--font-mono)',
          fontSize: '12px',
          color: 'var(--color-gold)',
          textDecoration: 'none',
          cursor: 'pointer',
        }}>
          JL
        </Link>
      </div>
    </header>
  )
}
