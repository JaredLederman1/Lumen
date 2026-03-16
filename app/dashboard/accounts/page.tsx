'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import AccountCard from '@/components/ui/AccountCard'
import { fetchAccounts } from '@/lib/data'

interface Account {
  id: string
  institutionName: string
  accountType: string
  balance: number
  last4: string | null
}

const CONNECTORS = [
  { id: 'mikomo',      label: 'Mikomo Bank (Sandbox)' },
  { id: 'schwab',      label: 'Charles Schwab' },
  { id: 'capital-one', label: 'Capital One' },
]

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

function InstitutionGroup({
  name,
  accounts,
  onRemove,
}: {
  name: string
  accounts: Account[]
  onRemove: (id: string) => void
}) {
  const [open, setOpen] = useState(true)
  const total = accounts.reduce((s, a) => s + a.balance, 0)
  const initials = getInitials(name)

  return (
    <div style={{ border: '1px solid rgba(184,145,58,0.15)', borderRadius: '2px', overflow: 'hidden' }}>
      {/* Institution header row */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', backgroundColor: '#FFFFFF', border: 'none', cursor: 'pointer',
          transition: 'background-color 120ms ease',
        }}
        onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(184,145,58,0.02)')}
        onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '50%',
            backgroundColor: 'rgba(184,145,58,0.08)', border: '1px solid rgba(184,145,58,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '11px', fontWeight: 500, color: '#B8913A', fontFamily: 'var(--font-mono)',
            flexShrink: 0,
          }}>
            {initials}
          </div>
          <div style={{ textAlign: 'left' }}>
            <p style={{ fontSize: '14px', color: '#1A1714', fontFamily: 'var(--font-serif)', fontWeight: 400, marginBottom: '2px' }}>
              {name}
            </p>
            <p style={{ fontSize: '11px', color: '#A89880', fontFamily: 'var(--font-mono)', letterSpacing: '0.03em' }}>
              {accounts.length} account{accounts.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <p style={{ fontFamily: 'var(--font-serif)', fontSize: '18px', fontWeight: 400, color: total < 0 ? '#8B2635' : '#1A1714' }}>
            {fmt(total)}
          </p>
          <span style={{ fontSize: '10px', color: '#A89880', transition: 'transform 200ms ease', display: 'inline-block', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>
            ▼
          </span>
        </div>
      </button>

      {/* Account rows */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            style={{ overflow: 'hidden' }}
          >
            {accounts.map(account => (
              <AccountCard
                key={account.id}
                id={account.id}
                accountType={account.accountType}
                balance={account.balance}
                last4={account.last4}
                onRemove={onRemove}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function AccountsContent() {
  const searchParams = useSearchParams()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [pendingConnector, setPendingConnector] = useState<{ id: string; label: string } | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const success = searchParams.get('success')
  const error = searchParams.get('error')
  const errorDesc = searchParams.get('desc')

  useEffect(() => {
    fetchAccounts()
      .then(a => setAccounts(a))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleRemove = (id: string) => setAccounts(prev => prev.filter(a => a.id !== id))

  const handleReset = async () => {
    if (!confirm('Delete all accounts and transactions so you can re-connect?')) return
    setResetting(true)
    try {
      const res = await fetch('/api/akoya/reset', { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        setAccounts([])
        alert(`Reset complete: removed ${data.deletedAccounts} account(s) and ${data.deletedTransactions} transaction(s).`)
      } else {
        alert('Reset failed: ' + (data.error ?? 'unknown error'))
      }
    } catch {
      alert('Reset request failed')
    } finally {
      setResetting(false)
    }
  }

  // Group accounts by institution
  const grouped = accounts.reduce<Record<string, Account[]>>((acc, a) => {
    if (!acc[a.institutionName]) acc[a.institutionName] = []
    acc[a.institutionName].push(a)
    return acc
  }, {})

  const totalAssets = accounts.filter(a => a.balance > 0).reduce((s, a) => s + a.balance, 0)
  const totalLiabilities = Math.abs(accounts.filter(a => a.balance < 0).reduce((s, a) => s + a.balance, 0))

  const card = { backgroundColor: '#FFFFFF', border: '1px solid rgba(184,145,58,0.15)', borderRadius: '2px', padding: '28px' } as const
  const labelStyle = { fontFamily: 'var(--font-mono)', fontSize: '10px', color: '#A89880', textTransform: 'uppercase' as const, letterSpacing: '0.16em' } as const

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {success === 'connected' && (
        <div style={{ padding: '13px 18px', backgroundColor: 'rgba(45,106,79,0.06)', border: '1px solid rgba(45,106,79,0.2)', borderRadius: '2px', color: '#2D6A4F', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
          Account connected successfully. Your data has been synced.
        </div>
      )}
      {error && (
        <div style={{ padding: '13px 18px', backgroundColor: 'rgba(139,38,53,0.06)', border: '1px solid rgba(139,38,53,0.2)', borderRadius: '2px', color: '#8B2635', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
          {errorDesc
            ? `Connection failed: ${decodeURIComponent(errorDesc)}`
            : error === 'not_configured'
              ? 'Akoya credentials not configured. Restart the dev server after setting .env.local.'
              : 'Connection failed. Please try again.'}
        </div>
      )}

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
        {[
          { label: 'Total Assets',      value: totalAssets,                   color: '#2D6A4F' },
          { label: 'Total Liabilities', value: totalLiabilities,              color: '#8B2635' },
          { label: 'Net Worth',         value: totalAssets - totalLiabilities, color: '#B8913A' },
        ].map(({ label: lbl, value, color }) => (
          <div key={lbl} style={{ backgroundColor: '#FFFFFF', border: '1px solid rgba(184,145,58,0.15)', borderRadius: '2px', padding: '24px' }}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: '#A89880', textTransform: 'uppercase', letterSpacing: '0.16em', marginBottom: '10px' }}>{lbl}</p>
            <p style={{ fontFamily: 'var(--font-serif)', fontSize: '28px', fontWeight: 400, color }}>{fmt(value)}</p>
          </div>
        ))}
      </div>

      {/* Connected accounts */}
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px' }}>
          <p style={labelStyle}>Connected Accounts</p>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={handleReset}
              disabled={resetting}
              title="Dev only: delete all accounts and transactions to re-connect"
              style={{
                padding: '8px 12px', backgroundColor: 'transparent',
                border: '1px solid rgba(139,38,53,0.3)', borderRadius: '2px',
                color: '#8B2635', fontSize: '11px', fontFamily: 'var(--font-mono)', letterSpacing: '0.04em',
                cursor: resetting ? 'not-allowed' : 'pointer', opacity: resetting ? 0.5 : 1,
              }}
              onMouseEnter={e => !resetting && (e.currentTarget.style.backgroundColor = 'rgba(139,38,53,0.05)')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              {resetting ? 'Resetting…' : 'Reset [dev]'}
            </button>

          <div ref={dropdownRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setDropdownOpen(o => !o)}
              disabled={connecting}
              style={{
                display: 'flex', alignItems: 'center', gap: '7px', padding: '8px 14px',
                backgroundColor: 'transparent', border: '1px solid rgba(184,145,58,0.35)', borderRadius: '2px',
                color: '#B8913A', fontSize: '11px', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em',
                cursor: connecting ? 'not-allowed' : 'pointer', opacity: connecting ? 0.6 : 1,
              }}
            >
              {connecting ? 'Connecting…' : '+ Connect Institution'}
              <span style={{ fontSize: '9px', opacity: 0.6 }}>{dropdownOpen ? '▲' : '▼'}</span>
            </button>

            {dropdownOpen && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 6px)', right: 0, minWidth: '210px',
                backgroundColor: '#FFFFFF', border: '1px solid rgba(184,145,58,0.25)',
                borderRadius: '2px', overflow: 'hidden', zIndex: 50, boxShadow: '0 8px 24px rgba(26,23,20,0.10)',
              }}>
                {CONNECTORS.map((c, i) => (
                  <button
                    key={c.id}
                    onClick={() => { setDropdownOpen(false); setPendingConnector(c) }}
                    style={{
                      display: 'block', width: '100%', textAlign: 'left', padding: '11px 16px',
                      backgroundColor: 'transparent', border: 'none',
                      borderTop: i === 0 ? 'none' : '1px solid rgba(184,145,58,0.1)',
                      color: '#1A1714', fontSize: '12px', fontFamily: 'var(--font-mono)', cursor: 'pointer',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(184,145,58,0.05)')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {loading ? (
            <p style={{ color: '#A89880', fontFamily: 'var(--font-mono)', fontSize: '12px', padding: '20px 0' }}>Loading accounts…</p>
          ) : Object.keys(grouped).length === 0 ? (
            <p style={{ color: '#A89880', fontFamily: 'var(--font-mono)', fontSize: '12px', padding: '20px 0' }}>No accounts connected yet.</p>
          ) : (
            Object.entries(grouped).map(([institution, accts]) => (
              <InstitutionGroup
                key={institution}
                name={institution}
                accounts={accts}
                onRemove={handleRemove}
              />
            ))
          )}
        </div>
      </div>

      {/* Redirect confirmation modal */}
      <AnimatePresence>
        {pendingConnector && (
          <motion.div
            key="redirect-overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={() => setPendingConnector(null)}
            style={{
              position: 'fixed', inset: 0, backgroundColor: 'rgba(8,11,15,0.55)',
              backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center',
              justifyContent: 'center', zIndex: 200,
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.97 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              onClick={e => e.stopPropagation()}
              style={{
                backgroundColor: '#FFFFFF', border: '1px solid rgba(184,145,58,0.2)',
                borderRadius: '3px', padding: '32px 36px', maxWidth: '420px', width: '100%', margin: '0 20px',
              }}
            >
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: '#B8913A', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '14px' }}>
                Secure redirect
              </p>
              <p style={{ fontFamily: 'var(--font-serif)', fontSize: '20px', fontWeight: 400, color: '#1A1714', marginBottom: '12px', lineHeight: 1.3 }}>
                You&apos;re leaving Illumin
              </p>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: '#4A5568', lineHeight: 1.7, marginBottom: '28px' }}>
                You&apos;ll be redirected to <span style={{ color: '#1A1714', fontWeight: 500 }}>{pendingConnector.label}</span> to securely authorize Illumin to read your account data. No credentials are shared with Illumin.
              </p>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => { setConnecting(true); setPendingConnector(null); window.location.href = `/api/akoya/connect?connectorId=${pendingConnector.id}` }}
                  style={{
                    flex: 1, padding: '11px 0', backgroundColor: '#B8913A', border: 'none', borderRadius: '2px',
                    color: '#FFFFFF', fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.06em', cursor: 'pointer',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
                  onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                >
                  Continue to {pendingConnector.label}
                </button>
                <button
                  onClick={() => setPendingConnector(null)}
                  style={{
                    padding: '11px 18px', backgroundColor: 'transparent', border: '1px solid rgba(184,145,58,0.25)',
                    borderRadius: '2px', color: '#8A95A3', fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.06em', cursor: 'pointer',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#1A1714')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#8A95A3')}
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function AccountsPage() {
  return (
    <Suspense fallback={null}>
      <AccountsContent />
    </Suspense>
  )
}
