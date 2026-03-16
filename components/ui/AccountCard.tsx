'use client'

import { useState, useRef, useEffect } from 'react'

interface AccountCardProps {
  id?: string
  accountType: string
  balance: number
  last4?: string | null
  onRemove?: (id: string) => void
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(n)
}

const accountTypeLabel: Record<string, string> = {
  checking:   'Checking',
  savings:    'Savings',
  credit:     'Credit Card',
  brokerage:  'Brokerage',
  investment: 'Investment',
}

export default function AccountCard({ id, accountType, balance, last4, onRemove }: AccountCardProps) {
  const isNegative = balance < 0
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [removing, setRemoving] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
        setConfirming(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleRemove = async () => {
    if (!id) return
    setRemoving(true)
    setMenuOpen(false)
    await fetch(`/api/accounts/${id}`, { method: 'DELETE' })
    onRemove?.(id)
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 20px 12px 52px',
      borderTop: '1px solid rgba(184,145,58,0.08)',
      opacity: removing ? 0.4 : 1,
      transition: 'opacity 200ms ease',
    }}>
      <div>
        <p style={{ fontSize: '13px', color: '#1A1714', fontFamily: 'var(--font-serif)', fontWeight: 400, marginBottom: '2px' }}>
          {accountTypeLabel[accountType] ?? accountType}
        </p>
        <p style={{ fontSize: '11px', color: '#A89880', fontFamily: 'var(--font-mono)', letterSpacing: '0.03em' }}>
          {last4 ? `···· ${last4}` : 'No account number'}
        </p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <p style={{ fontFamily: 'var(--font-serif)', fontSize: '16px', fontWeight: 400, color: isNegative ? '#8B2635' : '#1A1714' }}>
          {formatCurrency(balance)}
        </p>

        {id && (
          <div ref={menuRef} style={{ position: 'relative' }}>
            <button
              onClick={() => { setMenuOpen(o => !o); setConfirming(false) }}
              style={{
                width: '26px', height: '26px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'none', border: '1px solid transparent', borderRadius: '2px',
                color: '#A89880', fontSize: '14px', cursor: 'pointer', lineHeight: 1,
                transition: 'border-color 120ms ease, color 120ms ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(184,145,58,0.25)'; e.currentTarget.style.color = '#B8913A' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.color = '#A89880' }}
              title="Account settings"
            >
              ···
            </button>

            {menuOpen && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 4px)', right: 0,
                backgroundColor: '#FFFFFF', border: '1px solid rgba(184,145,58,0.2)',
                borderRadius: '2px', boxShadow: '0 6px 20px rgba(26,23,20,0.10)',
                zIndex: 50, minWidth: '150px', overflow: 'hidden',
              }}>
                {confirming ? (
                  <div style={{ padding: '12px 14px' }}>
                    <p style={{ fontSize: '11px', color: '#8B2635', fontFamily: 'var(--font-mono)', marginBottom: '10px' }}>
                      Remove this account?
                    </p>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={handleRemove}
                        style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: '#FFFFFF', background: '#8B2635', border: 'none', borderRadius: '2px', padding: '5px 10px', cursor: 'pointer' }}
                      >
                        Remove
                      </button>
                      <button
                        onClick={() => setConfirming(false)}
                        style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: '#A89880', background: 'none', border: '1px solid rgba(184,145,58,0.2)', borderRadius: '2px', padding: '5px 10px', cursor: 'pointer' }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirming(true)}
                    style={{
                      display: 'block', width: '100%', textAlign: 'left',
                      padding: '10px 14px', background: 'none', border: 'none',
                      fontSize: '12px', fontFamily: 'var(--font-mono)', color: '#8B2635',
                      cursor: 'pointer', transition: 'background-color 100ms ease',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(139,38,53,0.05)')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    Remove account
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
