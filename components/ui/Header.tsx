'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

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
  const title = pageTitles[pathname] ?? 'Sovreign'
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const email = data.session?.user?.email
      const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL
      setIsAdmin(!!email && !!adminEmail && email === adminEmail)
    })
  }, [])

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
      backgroundColor: '#FFFFFF',
      flexShrink: 0,
    }}>
      <h1 style={{
        fontFamily: 'var(--font-serif)',
        fontSize: '20px',
        fontWeight: 400,
        color: '#1A1714',
        margin: 0,
        letterSpacing: '0.01em',
      }}>
        {title}
      </h1>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <span style={{
          fontSize: '11px',
          color: '#A89880',
          fontFamily: 'var(--font-mono)',
          letterSpacing: '0.04em',
        }}>
          {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })}
        </span>
        {isAdmin && (
          <>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '9px',
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
                fontSize: '9px',
                color: '#A89880',
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
        <div style={{
          width: '30px',
          height: '30px',
          borderRadius: '50%',
          backgroundColor: 'rgba(184,145,58,0.08)',
          border: '1px solid rgba(184,145,58,0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'var(--font-mono)',
          fontSize: '10px',
          color: '#B8913A',
        }}>
          JL
        </div>
      </div>
    </header>
  )
}
