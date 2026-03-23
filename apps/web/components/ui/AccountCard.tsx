'use client'

import { useState, useRef, useEffect } from 'react'

interface AccountCardProps {
  id?: string
  accountType: string
  classification?: string
  balance: number
  last4?: string | null
  onRemove?: (id: string) => void
  authToken?: string | null
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

export default function AccountCard({ id, accountType, classification, balance, last4, onRemove, authToken }: AccountCardProps) {
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
    const headers: Record<string, string> = authToken ? { Authorization: `Bearer ${authToken}` } : {}
    await fetch(`/api/accounts/${id}`, { method: 'DELETE', headers })
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
          <p style={{ fontSize: '16px', color: '#F0F2F8', fontFamily: 'var(--font-serif)', fontWeight: 400 }}>
            {accountTypeLabel[accountType] ?? accountType}
          </p>
          {classification && (
            <span style={{
              fontSize: '11px', fontFamily: 'var(--font-mono)', letterSpacing: '0.10em',
              textTransform: 'uppercase', padding: '2px 6px', borderRadius: '2px',
              backgroundColor: classification === 'liability' ? 'rgba(224,92,110,0.10)' : 'rgba(76,175,125,0.10)',
              color: classification === 'liability' ? '#E05C6E' : '#4CAF7D',
              border: `1px solid ${classification === 'liability' ? 'rgba(224,92,110,0.20)' : 'rgba(76,175,125,0.20)'}`,
            }}>
              {classification === 'liability' ? 'Liability' : 'Asset'}
            </span>
          )}
        </div>
        <p style={{ fontSize: '13px', color: '#6B7A8D', fontFamily: 'var(--font-mono)', letterSpacing: '0.03em' }}>
          {last4 ? `···· ${last4}` : 'No account number'}
        </p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <p style={{ fontFamily: 'var(--font-sans)', fontSize: '19px', fontWeight: 400, color: isNegative ? '#E05C6E' : '#F0F2F8' }}>
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
                color: '#6B7A8D', fontSize: '17px', cursor: 'pointer', lineHeight: 1,
                transition: 'border-color 120ms ease, color 120ms ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(184,145,58,0.25)'; e.currentTarget.style.color = '#B8913A' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.color = '#6B7A8D' }}
              title="Account settings"
            >
              ···
            </button>

            {menuOpen && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 4px)', right: 0,
                backgroundColor: '#0F1318', border: '1px solid rgba(184,145,58,0.2)',
                borderRadius: '2px', boxShadow: '0 6px 20px rgba(8,11,15,0.40)',
                zIndex: 50, minWidth: '150px', overflow: 'hidden',
              }}>
                {confirming ? (
                  <div style={{ padding: '12px 14px' }}>
                    <p style={{ fontSize: '13px', color: '#E05C6E', fontFamily: 'var(--font-mono)', marginBottom: '10px' }}>
                      Remove this account?
                    </p>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={handleRemove}
                        style={{ fontSize: '13px', fontFamily: 'var(--font-mono)', color: '#F0F2F8', background: '#E05C6E', border: 'none', borderRadius: '2px', padding: '5px 10px', cursor: 'pointer' }}
                      >
                        Remove
                      </button>
                      <button
                        onClick={() => setConfirming(false)}
                        style={{ fontSize: '13px', fontFamily: 'var(--font-mono)', color: '#6B7A8D', background: 'none', border: '1px solid rgba(184,145,58,0.2)', borderRadius: '2px', padding: '5px 10px', cursor: 'pointer' }}
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
                      fontSize: '14px', fontFamily: 'var(--font-mono)', color: '#E05C6E',
                      cursor: 'pointer', transition: 'background-color 100ms ease',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(224,92,110,0.08)')}
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
