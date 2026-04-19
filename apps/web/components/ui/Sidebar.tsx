'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

const sections = [
  {
    label: 'WEALTH',
    items: [
      { href: '/dashboard/accounts',     label: 'Accounts'         },
      { href: '/dashboard/portfolio',    label: 'Portfolio'        },
    ],
  },
  {
    label: 'ACTIVITY',
    items: [
      { href: '/dashboard/transactions', label: 'Transactions'     },
      { href: '/dashboard/cashflow',     label: 'Cash Flow'        },
      { href: '/dashboard/budget',       label: 'Budget'           },
      { href: '/dashboard/recurring',    label: 'Recurring'        },
    ],
  },
  {
    label: 'FORECAST',
    items: [
      { href: '/dashboard/forecast',     label: 'Projections'      },
      { href: '/dashboard/goals',        label: 'Goals'            },
    ],
  },
  {
    label: 'INTELLIGENCE',
    items: [
      { href: '/dashboard/score',        label: 'Score'            },
      { href: '/dashboard/benefits',     label: 'Benefits'         },
      { href: '/dashboard/opportunity',  label: 'Opportunity Cost' },
    ],
  },
]

export default function Sidebar() {
  const pathname = usePathname()
  const [open, setOpen] = useState<Record<string, boolean>>({
    WEALTH: false,
    ACTIVITY: false,
    FORECAST: false,
    INTELLIGENCE: false,
  })

  const toggle = (label: string) =>
    setOpen((prev) => {
      const isCurrentlyOpen = prev[label]
      const allClosed = Object.fromEntries(Object.keys(prev).map((k) => [k, false]))
      return { ...allClosed, [label]: !isCurrentlyOpen }
    })

  const isActive = (href: string) =>
    href === '/dashboard'
      ? pathname === '/dashboard'
      : pathname.startsWith(href)

  const linkStyle = (href: string): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    padding: '9px 28px 9px 44px',
    borderLeft: isActive(href)
      ? '2px solid var(--color-gold)'
      : '2px solid transparent',
    marginBottom: '1px',
    textDecoration: 'none',
    color: isActive(href) ? 'var(--color-text)' : 'var(--color-text-muted)',
    backgroundColor: isActive(href) ? 'var(--color-gold-subtle)' : 'transparent',
    fontSize: '14px',
    fontFamily: 'var(--font-mono)',
    letterSpacing: '0.06em',
    transition: 'color 120ms ease, background-color 120ms ease',
  })

  const standaloneStyle = (href: string): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    padding: '10px 28px',
    borderLeft: isActive(href)
      ? '2px solid var(--color-gold)'
      : '2px solid transparent',
    marginBottom: '1px',
    textDecoration: 'none',
    color: isActive(href) ? 'var(--color-text)' : 'var(--color-text-muted)',
    backgroundColor: isActive(href) ? 'var(--color-gold-subtle)' : 'transparent',
    fontSize: '14px',
    fontFamily: 'var(--font-mono)',
    letterSpacing: '0.06em',
    transition: 'color 120ms ease, background-color 120ms ease',
  })

  return (
    <aside style={{
      width: '220px',
      minHeight: '100vh',
      backgroundColor: '#0F1318',
      borderRight: '1px solid rgba(184,145,58,0.18)',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
    }}>
      {/* Wordmark */}
      <Link href="/dashboard" style={{
        padding: '40px 28px 32px',
        borderBottom: '1px solid rgba(184,145,58,0.12)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        textDecoration: 'none',
        cursor: 'pointer',
      }}>
        <div style={{
          fontFamily: 'var(--font-serif)',
          fontSize: '22px',
          fontWeight: 500,
          color: '#B8913A',
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          marginBottom: '5px',
        }}>
          Illumin
        </div>
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          color: '#6B7A8D',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
        }}>
          Wealth Management
        </div>
      </Link>

      {/* Nav */}
      <nav style={{ paddingTop: '16px', flex: 1 }}>
        {/* Overview */}
        <Link href="/dashboard" style={standaloneStyle('/dashboard')}>
          DASHBOARD
        </Link>

        {/* Divider */}
        <div style={{ margin: '12px 28px', borderTop: '1px solid var(--color-border)' }} />

        {/* Sections */}
        {sections.map((section, i) => {
          const isOpen = open[section.label]
          return (
            <div key={section.label} style={{ marginBottom: i < sections.length - 1 ? '4px' : '0' }}>
              {/* Section heading — clickable toggle */}
              <button
                onClick={() => toggle(section.label)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  padding: '6px 28px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '12px',
                  color: 'var(--color-text-muted)',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  userSelect: 'none',
                  marginBottom: isOpen ? '2px' : '8px',
                  transition: 'color 120ms ease',
                }}
              >
                {section.label}
                <motion.span
                  animate={{ rotate: isOpen ? 180 : 0 }}
                  transition={{ duration: 0.2, ease: 'easeInOut' }}
                  style={{ display: 'flex', alignItems: 'center', opacity: 0.5 }}
                >
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                    <path d="M1 2.5L4 5.5L7 2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </motion.span>
              </button>

              {/* Collapsible items */}
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    key="items"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.22, ease: 'easeInOut' }}
                    style={{ overflow: 'hidden' }}
                  >
                    {section.items.map((item) => (
                      <Link key={item.href} href={item.href} style={linkStyle(item.href)}>
                        {item.label}
                      </Link>
                    ))}
                    <div style={{ height: '12px' }} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}

        {/* Divider */}
        <div style={{ margin: '8px 28px 12px', borderTop: '1px solid var(--color-border)' }} />

        {/* Profile */}
        <Link href="/dashboard/profile" style={standaloneStyle('/dashboard/profile')}>
          PROFILE
        </Link>

        {/* Checklist */}
        <Link href="/dashboard/checklist" style={standaloneStyle('/dashboard/checklist')}>
          CHECKLIST
        </Link>
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
          backgroundColor: 'rgba(184,145,58,0.10)',
          border: '1px solid rgba(184,145,58,0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'var(--font-mono)',
          fontSize: '12px',
          color: '#B8913A',
          letterSpacing: '0.05em',
          flexShrink: 0,
        }}>
          JL
        </div>
        <div>
          <div style={{ fontSize: '13px', color: '#A8B4C0', fontFamily: 'var(--font-mono)', marginBottom: '2px' }}>
            Jared L.
          </div>
          <Link href="/auth/login" style={{
            fontSize: '12px',
            color: '#6B7A8D',
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
