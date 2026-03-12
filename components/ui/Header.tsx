'use client'

import { usePathname } from 'next/navigation'

const pageTitles: Record<string, string> = {
  '/dashboard':              'Overview',
  '/dashboard/accounts':     'Accounts',
  '/dashboard/transactions': 'Transactions',
  '/dashboard/cashflow':     'Cash Flow',
  '/dashboard/forecast':     'Forecast',
}

export default function Header() {
  const pathname = usePathname()
  const title = pageTitles[pathname] ?? 'Sovreign'

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
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <span style={{
          fontSize: '11px',
          color: '#A89880',
          fontFamily: 'var(--font-mono)',
          letterSpacing: '0.04em',
        }}>
          {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })}
        </span>
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
