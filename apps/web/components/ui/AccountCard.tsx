'use client'

import { useState, useRef, useEffect } from 'react'
import { useDeleteAccountMutation } from '@/lib/queries'

interface AccountCardProps {
  id?: string
  accountType: string
  classification?: string
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

export default function AccountCard({ id, accountType, classification, balance, last4, onRemove }: AccountCardProps) {
  const isNegative = balance < 0
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const deleteAccount = useDeleteAccountMutation()
  const removing = deleteAccount.isPending
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

  const handleRemove = () => {
    if (!id) return
    setMenuOpen(false)
    deleteAccount.mutate(id, {
      onSuccess: () => onRemove?.(id),
    })
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 20px 12px 52px',
      borderTop: '1px solid var(--color-border)',
      opacity: removing ? 0.4 : 1,
      transition: 'opacity 200ms ease',
    }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
          <p style={{ fontSize: '16px', color: 'var(--color-text)', fontFamily: 'var(--font-serif)', fontWeight: 400 }}>
            {accountTypeLabel[accountType] ?? accountType}
          </p>
          {classification && (
            <span style={{
              fontSize: '10px',
              fontFamily: 'var(--font-sans)',
              fontWeight: 500,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              padding: '2px 10px',
              borderRadius: 'var(--radius-pill)',
              backgroundColor: classification === 'liability' ? 'var(--color-negative-bg)' : 'var(--color-positive-bg)',
              color: classification === 'liability' ? 'var(--color-negative)' : 'var(--color-positive)',
              border: `1px solid ${classification === 'liability' ? 'var(--color-negative-border)' : 'var(--color-positive-border)'}`,
            }}>
              {classification === 'liability' ? 'Liability' : 'Asset'}
            </span>
          )}
        </div>
        <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)', letterSpacing: '0.03em' }}>
          {last4 ? `···· ${last4}` : 'No account number'}
        </p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <p style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '19px',
          fontWeight: 400,
          color: isNegative ? 'var(--color-negative)' : 'var(--color-text)',
        }}>
          {formatCurrency(balance)}
        </p>

        {id && (
          <div ref={menuRef} style={{ position: 'relative' }}>
            <button
              onClick={() => { setMenuOpen(o => !o); setConfirming(false) }}
              style={{
                width: '26px', height: '26px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'none',
                border: '1px solid transparent',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--color-text-muted)',
                fontSize: '17px',
                cursor: 'pointer',
                lineHeight: 1,
                transition: 'border-color 150ms ease, color 150ms ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-border-hover)'; e.currentTarget.style.color = 'var(--color-gold)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.color = 'var(--color-text-muted)' }}
              title="Account settings"
            >
              ···
            </button>

            {menuOpen && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 4px)', right: 0,
                backgroundColor: 'var(--color-surface-elevated)',
                border: '1px solid var(--color-border-strong)',
                borderRadius: 'var(--radius-md)',
                boxShadow: '0 6px 20px rgba(0,0,0,0.40)',
                zIndex: 50, minWidth: '160px', overflow: 'hidden',
              }}>
                {confirming ? (
                  <div style={{ padding: '12px 14px' }}>
                    <p style={{ fontSize: '13px', color: 'var(--color-negative)', fontFamily: 'var(--font-mono)', marginBottom: '10px' }}>
                      Remove this account?
                    </p>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={handleRemove}
                        style={{
                          fontSize: '13px',
                          fontFamily: 'var(--font-sans)',
                          fontWeight: 500,
                          color: 'var(--color-text)',
                          background: 'var(--color-negative)',
                          border: 'none',
                          borderRadius: 'var(--radius-sm)',
                          padding: '5px 12px',
                          cursor: 'pointer',
                        }}
                      >
                        Remove
                      </button>
                      <button
                        onClick={() => setConfirming(false)}
                        style={{
                          fontSize: '13px',
                          fontFamily: 'var(--font-sans)',
                          fontWeight: 500,
                          color: 'var(--color-text-muted)',
                          background: 'none',
                          border: '1px solid var(--color-border-strong)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '5px 12px',
                          cursor: 'pointer',
                        }}
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
                      fontSize: '14px', fontFamily: 'var(--font-mono)', color: 'var(--color-negative)',
                      cursor: 'pointer', transition: 'background-color 120ms ease',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--color-negative-bg)')}
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
