'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { href: '/dashboard',              label: 'Overview'     },
  { href: '/dashboard/accounts',     label: 'Accounts'     },
  { href: '/dashboard/transactions', label: 'Transactions' },
  { href: '/dashboard/cashflow',     label: 'Cash Flow'    },
  { href: '/dashboard/forecast',     label: 'Forecast'     },
  { href: '/dashboard/benefits',     label: 'Benefits'     },
  { href: '/dashboard/score',        label: 'Score'        },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside style={{
      width: '220px',
      minHeight: '100vh',
      backgroundColor: '#FFFFFF',
      borderRight: '1px solid rgba(184,145,58,0.18)',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
    }}>
      {/* Logo */}
      <div style={{
        padding: '40px 28px 32px',
        borderBottom: '1px solid rgba(184,145,58,0.12)',
      }}>
        <div style={{
          fontFamily: 'var(--font-serif)',
          fontSize: '18px',
          fontWeight: 500,
          color: '#B8913A',
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          marginBottom: '5px',
        }}>
          Sovreign
        </div>
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '9px',
          color: '#A89880',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
        }}>
          Wealth Management
        </div>
      </div>

      {/* Nav */}
      <nav style={{ paddingTop: '16px', flex: 1 }}>
        {navItems.map((item) => {
          const isActive = item.href === '/dashboard'
            ? pathname === '/dashboard'
            : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '10px 28px',
                borderLeft: isActive ? '2px solid #B8913A' : '2px solid transparent',
                marginBottom: '2px',
                textDecoration: 'none',
                color: isActive ? '#B8913A' : '#A89880',
                backgroundColor: isActive ? 'rgba(184,145,58,0.05)' : 'transparent',
                fontSize: '12px',
                fontFamily: 'var(--font-mono)',
                letterSpacing: '0.06em',
                transition: 'all 150ms ease',
              }}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div style={{
        padding: '20px 28px',
        borderTop: '1px solid rgba(184,145,58,0.12)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
      }}>
        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          backgroundColor: 'rgba(184,145,58,0.08)',
          border: '1px solid rgba(184,145,58,0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'var(--font-mono)',
          fontSize: '10px',
          color: '#B8913A',
          letterSpacing: '0.05em',
          flexShrink: 0,
        }}>
          JL
        </div>
        <div>
          <div style={{ fontSize: '11px', color: '#6B5D4A', fontFamily: 'var(--font-mono)', marginBottom: '2px' }}>
            Jared L.
          </div>
          <Link href="/auth/login" style={{
            fontSize: '10px',
            color: '#A89880',
            fontFamily: 'var(--font-mono)',
            textDecoration: 'none',
          }}>
            Sign out
          </Link>
        </div>
      </div>
    </aside>
  )
}
