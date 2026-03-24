'use client'

import { useState, useRef, Suspense, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { usePlaidLink } from 'react-plaid-link'
import AccountCard from '@/components/ui/AccountCard'
import DataTooltip from '@/components/ui/DataTooltip'
import { useDashboard } from '@/lib/dashboardData'
import { useCountUp } from '@/lib/useCountUp'
import { useIsMobile } from '@/hooks/useIsMobile'
import MobileCard from '@/components/ui/MobileCard'
import MobileMetricCard from '@/components/ui/MobileMetricCard'
import { colors, fonts, spacing } from '@/lib/theme'

interface Account {
  id: string
  institutionName: string
  accountType: string
  classification?: string
  balance: number
  last4: string | null
}

interface PlaidOnSuccessMetadata {
  institution: { name: string; institution_id: string } | null
  accounts: Array<{
    id: string
    name: string
    mask: string | null
    type: string
    subtype: string | null
  }>
}

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
  onRemoveInstitution,
  authToken,
}: {
  name: string
  accounts: Account[]
  onRemove: (id: string) => void
  onRemoveInstitution: (institutionName: string) => void
  authToken: string | null
}) {
  const [open, setOpen] = useState(true)
  const [confirmRemoveAll, setConfirmRemoveAll] = useState(false)
  const [removingAll, setRemovingAll] = useState(false)
  const total = accounts.reduce((s, a) => s + a.balance, 0)
  const initials = getInitials(name)

  const handleRemoveInstitution = async () => {
    setRemovingAll(true)
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      }
      const res = await fetch('/api/accounts/institution', {
        method: 'DELETE',
        headers,
        body: JSON.stringify({ institutionName: name }),
      })
      if (res.ok) {
        onRemoveInstitution(name)
      }
    } catch {
      // silent
    } finally {
      setRemovingAll(false)
      setConfirmRemoveAll(false)
    }
  }

  return (
    <div style={{ border: '1px solid rgba(184,145,58,0.15)', borderRadius: '2px', overflow: 'hidden', opacity: removingAll ? 0.4 : 1, transition: 'opacity 200ms ease' }}>
      <div
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', backgroundColor: '#0F1318',
        }}
      >
        <button
          onClick={() => setOpen(o => !o)}
          style={{
            display: 'flex', alignItems: 'center', gap: '14px',
            background: 'none', border: 'none', cursor: 'pointer', padding: 0, flex: 1,
          }}
        >
          <div style={{
            width: '36px', height: '36px', borderRadius: '50%',
            backgroundColor: 'rgba(184,145,58,0.08)', border: '1px solid rgba(184,145,58,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '13px', fontWeight: 500, color: '#B8913A', fontFamily: 'var(--font-mono)',
            flexShrink: 0,
          }}>
            {initials}
          </div>
          <div style={{ textAlign: 'left' }}>
            <p style={{ fontSize: '19px', color: '#F0F2F8', fontFamily: 'var(--font-serif)', fontWeight: 400, marginBottom: '2px' }}>
              {name}
            </p>
            <p style={{ fontSize: '13px', color: '#6B7A8D', fontFamily: 'var(--font-mono)', letterSpacing: '0.03em' }}>
              {accounts.length} account{accounts.length !== 1 ? 's' : ''}
            </p>
          </div>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '26px', fontWeight: 400, color: total < 0 ? '#E05C6E' : '#F0F2F8' }}>
            {fmt(total)}
          </p>

          {/* Remove institution */}
          {confirmRemoveAll ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }} onClick={e => e.stopPropagation()}>
              <button
                onClick={handleRemoveInstitution}
                disabled={removingAll}
                style={{
                  fontSize: '11px', fontFamily: 'var(--font-mono)', letterSpacing: '0.08em',
                  textTransform: 'uppercase', color: '#F0F2F8', background: '#E05C6E',
                  border: 'none', borderRadius: '2px', padding: '4px 10px',
                  cursor: removingAll ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap',
                }}
              >
                {removingAll ? 'Removing...' : 'Confirm'}
              </button>
              <button
                onClick={() => setConfirmRemoveAll(false)}
                style={{
                  fontSize: '11px', fontFamily: 'var(--font-mono)', color: '#6B7A8D',
                  background: 'none', border: '1px solid rgba(184,145,58,0.2)',
                  borderRadius: '2px', padding: '4px 8px', cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={e => { e.stopPropagation(); setConfirmRemoveAll(true) }}
              title={`Remove all ${name} accounts`}
              style={{
                fontSize: '11px', fontFamily: 'var(--font-mono)', letterSpacing: '0.08em',
                textTransform: 'uppercase', color: '#6B7A8D', background: 'none',
                border: '1px solid transparent', borderRadius: '2px', padding: '4px 8px',
                cursor: 'pointer', transition: 'color 120ms ease, border-color 120ms ease',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = '#E05C6E'; e.currentTarget.style.borderColor = 'rgba(224,92,110,0.3)' }}
              onMouseLeave={e => { e.currentTarget.style.color = '#6B7A8D'; e.currentTarget.style.borderColor = 'transparent' }}
            >
              Remove All
            </button>
          )}

          <button
            onClick={() => setOpen(o => !o)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
          >
            <span style={{ fontSize: '12px', color: '#6B7A8D', transition: 'transform 200ms ease', display: 'inline-block', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>
              ▼
            </span>
          </button>
        </div>
      </div>

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
                classification={account.classification}
                balance={account.balance}
                last4={account.last4}
                onRemove={onRemove}
                authToken={authToken}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function ConnectButton({
  onSuccess,
}: {
  onSuccess: (accounts: Account[]) => void
}) {
  const { authToken } = useDashboard()
  const [linkToken, setLinkToken] = useState<string | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const headers: Record<string, string> = authToken ? { Authorization: `Bearer ${authToken}` } : {}
    fetch('/api/plaid/create-link-token', { headers })
      .then(r => r.json())
      .then(data => {
        if (data.linkToken) setLinkToken(data.linkToken)
        else setError('Could not initialize connection. Check Plaid credentials.')
      })
      .catch(() => setError('Could not initialize connection.'))
  }, [authToken])

  const handlePlaidSuccess = useCallback(
    async (publicToken: string, metadata: PlaidOnSuccessMetadata) => {
      setConnecting(true)
      setError(null)
      try {
        const authHeaders: Record<string, string> = authToken ? { Authorization: `Bearer ${authToken}` } : {}
        const res = await fetch('/api/plaid/exchange-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders },
          body: JSON.stringify({
            publicToken,
            institutionName: metadata.institution?.name ?? 'Connected Institution',
            accounts: metadata.accounts,
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? 'Exchange failed')
        onSuccess(data.accounts ?? [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Connection failed')
      } finally {
        setConnecting(false)
      }
    },
    [onSuccess, authToken]
  )

  const { open, ready } = usePlaidLink({
    token: linkToken ?? '',
    onSuccess: handlePlaidSuccess,
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
      <button
        onClick={() => open()}
        disabled={!ready || connecting}
        style={{
          display: 'flex', alignItems: 'center', gap: '7px', padding: '8px 14px',
          backgroundColor: 'transparent', border: '1px solid rgba(184,145,58,0.35)', borderRadius: '2px',
          color: '#B8913A', fontSize: '13px', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em',
          cursor: (!ready || connecting) ? 'not-allowed' : 'pointer',
          opacity: (!ready || connecting) ? 0.6 : 1,
        }}
      >
        {connecting ? 'Connecting...' : '+ Connect Account'}
      </button>
      {error && (
        <p style={{ fontSize: '13px', color: '#E05C6E', fontFamily: 'var(--font-mono)' }}>{error}</p>
      )}
    </div>
  )
}

// Shared Plaid connect logic extracted for mobile use
function useMobilePlaidConnect(onSuccess: (accounts: Account[]) => void) {
  const { authToken } = useDashboard()
  const [linkToken, setLinkToken] = useState<string | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const headers: Record<string, string> = authToken ? { Authorization: `Bearer ${authToken}` } : {}
    fetch('/api/plaid/create-link-token', { headers })
      .then(r => r.json())
      .then(data => {
        if (data.linkToken) setLinkToken(data.linkToken)
        else setError('Could not initialize connection.')
      })
      .catch(() => setError('Could not initialize connection.'))
  }, [authToken])

  const handlePlaidSuccess = useCallback(
    async (publicToken: string, metadata: PlaidOnSuccessMetadata) => {
      setConnecting(true)
      setError(null)
      try {
        const authHeaders: Record<string, string> = authToken ? { Authorization: `Bearer ${authToken}` } : {}
        const res = await fetch('/api/plaid/exchange-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders },
          body: JSON.stringify({
            publicToken,
            institutionName: metadata.institution?.name ?? 'Connected Institution',
            accounts: metadata.accounts,
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? 'Exchange failed')
        onSuccess(data.accounts ?? [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Connection failed')
      } finally {
        setConnecting(false)
      }
    },
    [onSuccess, authToken]
  )

  const { open, ready } = usePlaidLink({
    token: linkToken ?? '',
    onSuccess: handlePlaidSuccess,
  })

  return { open, ready, connecting, error }
}

function AccountsContent() {
  const { loading, accounts, setAccounts, refresh, authToken } = useDashboard()
  const [resetting, setResetting] = useState(false)
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const handleRemove = (id: string) => {
    setAccounts(prev => prev.filter(a => a.id !== id))
    refresh()
  }

  const handleRemoveInstitution = (institutionName: string) => {
    setAccounts(prev => prev.filter(a => a.institutionName !== institutionName))
    refresh()
  }

  const handleConnectSuccess = async (newAccounts: Account[]) => {
    setBanner({ type: 'success', message: `${newAccounts.length} account${newAccounts.length !== 1 ? 's' : ''} connected successfully. Syncing transactions...` })
    const authHeaders: Record<string, string> = authToken ? { Authorization: `Bearer ${authToken}` } : {}
    try {
      await fetch('/api/plaid/sync', { method: 'POST', headers: authHeaders })
    } catch {}
    await refresh()
    setBanner({ type: 'success', message: `${newAccounts.length} account${newAccounts.length !== 1 ? 's' : ''} connected successfully.` })
  }

  const handleReset = async () => {
    if (!confirm('Delete all accounts and transactions so you can re-connect?')) return
    setResetting(true)
    try {
      const authHeaders: Record<string, string> = authToken ? { Authorization: `Bearer ${authToken}` } : {}
      const res = await fetch('/api/plaid/reset', { method: 'POST', headers: authHeaders })
      const data = await res.json()
      if (data.success) {
        await refresh()
        setBanner({ type: 'success', message: `Reset complete: removed ${data.deletedAccounts} account(s) and ${data.deletedTransactions} transaction(s).` })
      } else {
        setBanner({ type: 'error', message: 'Reset failed: ' + (data.error ?? 'unknown error') })
      }
    } catch {
      setBanner({ type: 'error', message: 'Reset request failed' })
    } finally {
      setResetting(false)
    }
  }

  const grouped = accounts.reduce<Record<string, Account[]>>((acc, a) => {
    if (!acc[a.institutionName]) acc[a.institutionName] = []
    acc[a.institutionName].push(a)
    return acc
  }, {})

  const totalAssets = accounts.filter(a => a.classification === 'asset').reduce((s, a) => s + a.balance, 0)
  const totalLiabilities = accounts.filter(a => a.classification === 'liability').reduce((s, a) => s + Math.abs(a.balance), 0)

  const [hasPlayed, setHasPlayed] = useState(() => {
    try { return localStorage.getItem('illumin_accounts_animated') === 'true' } catch { return false }
  })

  useEffect(() => {
    if (!hasPlayed && accounts.length > 0 && !loading) {
      try { localStorage.setItem('illumin_accounts_animated', 'true') } catch {}
      setHasPlayed(true)
    }
  }, [accounts.length, loading, hasPlayed])

  const animatedAssets      = useCountUp(totalAssets, 900, hasPlayed)
  const animatedLiabilities = useCountUp(totalLiabilities, 900, hasPlayed)
  const animatedNetWorth    = useCountUp(totalAssets - totalLiabilities, 900, hasPlayed)

  const card = { backgroundColor: '#0F1318', border: '1px solid rgba(184,145,58,0.15)', borderRadius: '2px', padding: '28px' } as const
  const labelStyle = { fontFamily: 'var(--font-mono)', fontSize: '12px', color: '#6B7A8D', textTransform: 'uppercase' as const, letterSpacing: '0.16em' } as const

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {banner && (
        <div style={{
          padding: '13px 18px',
          backgroundColor: banner.type === 'success' ? 'rgba(76,175,125,0.10)' : 'rgba(224,92,110,0.08)',
          border: `1px solid ${banner.type === 'success' ? 'rgba(76,175,125,0.20)' : 'rgba(224,92,110,0.20)'}`,
          borderRadius: '2px',
          color: banner.type === 'success' ? '#4CAF7D' : '#E05C6E',
          fontFamily: 'var(--font-mono)', fontSize: '14px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          {banner.message}
          <button
            onClick={() => setBanner(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: '17px', lineHeight: 1, opacity: 0.6, padding: '0 0 0 12px' }}
          >
            x
          </button>
        </div>
      )}

      {/* Summary */}
      {(() => {
        const assetSources = accounts
          .filter(a => a.classification === 'asset')
          .map(a => ({
            label: a.institutionName + (a.last4 ? ' ....' + a.last4 : ''),
            value: a.balance,
            type: 'account' as const,
          }))
        const liabilitySources = accounts
          .filter(a => a.classification === 'liability')
          .map(a => ({
            label: a.institutionName + (a.last4 ? ' ....' + a.last4 : ''),
            value: Math.abs(a.balance),
            type: 'account' as const,
          }))
        const netWorthSources = [
          ...assetSources,
          ...accounts
            .filter(a => a.classification === 'liability')
            .map(a => ({
              label: a.institutionName + (a.last4 ? ' ....' + a.last4 : ''),
              value: -Math.abs(a.balance),
              type: 'account' as const,
            })),
        ]
        return (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            <div style={{ backgroundColor: '#0F1318', border: '1px solid rgba(184,145,58,0.15)', borderRadius: '2px', padding: '24px' }}>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: '#6B7A8D', textTransform: 'uppercase', letterSpacing: '0.16em', marginBottom: '10px' }}>Total Assets</p>
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: '41px', fontWeight: 400, color: '#4CAF7D' }}>
                <DataTooltip
                  value={animatedAssets}
                  title="Total Assets"
                  computationNote="Sum of all asset-classified accounts"
                  sources={assetSources}
                  accentColor="#4CAF7D"
                />
              </p>
            </div>
            <div style={{ backgroundColor: '#0F1318', border: '1px solid rgba(184,145,58,0.15)', borderRadius: '2px', padding: '24px' }}>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: '#6B7A8D', textTransform: 'uppercase', letterSpacing: '0.16em', marginBottom: '10px' }}>Total Liabilities</p>
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: '41px', fontWeight: 400, color: '#E05C6E' }}>
                <DataTooltip
                  value={animatedLiabilities}
                  title="Total Liabilities"
                  computationNote="Sum of all liability-classified accounts (shown as positive values)"
                  sources={liabilitySources}
                  accentColor="#E05C6E"
                />
              </p>
            </div>
            <div style={{ backgroundColor: '#0F1318', border: '1px solid rgba(184,145,58,0.15)', borderRadius: '2px', padding: '24px' }}>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: '#6B7A8D', textTransform: 'uppercase', letterSpacing: '0.16em', marginBottom: '10px' }}>Net Worth</p>
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: '41px', fontWeight: 400, color: '#B8913A' }}>
                <DataTooltip
                  value={animatedNetWorth}
                  title="Net Worth"
                  computationNote="Total assets minus total liabilities across all connected accounts"
                  sources={netWorthSources}
                  accentColor="#B8913A"
                />
              </p>
            </div>
          </div>
        )
      })()}

      {/* Connected accounts */}
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px' }}>
          <p style={labelStyle}>Connected Accounts</p>

          <ConnectButton onSuccess={handleConnectSuccess} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {loading ? (
            <p style={{ color: '#6B7A8D', fontFamily: 'var(--font-mono)', fontSize: '14px', padding: '20px 0' }}>Loading accounts...</p>
          ) : Object.keys(grouped).length === 0 ? (
            <p style={{ color: '#6B7A8D', fontFamily: 'var(--font-mono)', fontSize: '14px', padding: '20px 0' }}>No accounts connected yet.</p>
          ) : (
            Object.entries(grouped).map(([institution, accts]) => (
              <InstitutionGroup
                key={institution}
                name={institution}
                accounts={accts}
                onRemove={handleRemove}
                onRemoveInstitution={handleRemoveInstitution}
                authToken={authToken}
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}

function AccountsMobileContent() {
  const { loading, accounts, setAccounts, refresh, authToken } = useDashboard()
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const handleRemove = (id: string) => {
    setAccounts(prev => prev.filter(a => a.id !== id))
    refresh()
  }

  const handleRemoveInstitution = (institutionName: string) => {
    setAccounts(prev => prev.filter(a => a.institutionName !== institutionName))
    refresh()
  }

  const handleConnectSuccess = async (newAccounts: Account[]) => {
    setBanner({ type: 'success', message: `${newAccounts.length} account${newAccounts.length !== 1 ? 's' : ''} connected successfully. Syncing transactions...` })
    const authHeaders: Record<string, string> = authToken ? { Authorization: `Bearer ${authToken}` } : {}
    try {
      await fetch('/api/plaid/sync', { method: 'POST', headers: authHeaders })
    } catch {}
    await refresh()
    setBanner({ type: 'success', message: `${newAccounts.length} account${newAccounts.length !== 1 ? 's' : ''} connected successfully.` })
  }

  const { open, ready, connecting, error: connectError } = useMobilePlaidConnect(handleConnectSuccess)

  const grouped = accounts.reduce<Record<string, Account[]>>((acc, a) => {
    if (!acc[a.institutionName]) acc[a.institutionName] = []
    acc[a.institutionName].push(a)
    return acc
  }, {})

  const totalAssets = accounts.filter(a => a.classification === 'asset').reduce((s, a) => s + a.balance, 0)
  const totalLiabilities = accounts.filter(a => a.classification === 'liability').reduce((s, a) => s + Math.abs(a.balance), 0)
  const netWorth = totalAssets - totalLiabilities

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      style={{ display: 'flex', flexDirection: 'column', gap: spacing.sectionGap }}
    >
      {/* Banner */}
      {banner && (
        <div style={{
          padding: '13px 18px',
          backgroundColor: banner.type === 'success' ? colors.positiveBg : colors.negativeBg,
          border: `1px solid ${banner.type === 'success' ? colors.positiveBorder : colors.negativeBorder}`,
          borderRadius: 2,
          color: banner.type === 'success' ? colors.positive : colors.negative,
          fontFamily: fonts.mono,
          fontSize: 13,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          {banner.message}
          <button
            onClick={() => setBanner(null)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'inherit',
              fontSize: 17,
              lineHeight: 1,
              opacity: 0.6,
              padding: '0 0 0 12px',
              minHeight: spacing.tapTarget,
            }}
          >
            x
          </button>
        </div>
      )}

      {/* Summary cards */}
      <MobileMetricCard
        label="Total Assets"
        value={fmt(totalAssets)}
        valueColor={colors.positive}
      />
      <MobileMetricCard
        label="Total Liabilities"
        value={fmt(totalLiabilities)}
        valueColor={colors.negative}
      />
      <MobileMetricCard
        label="Net Worth"
        value={fmt(netWorth)}
        valueColor={colors.gold}
      />

      {/* Connected accounts */}
      <MobileCard>
        <p style={{
          fontFamily: fonts.mono,
          fontSize: 10,
          color: colors.textMuted,
          textTransform: 'uppercase',
          letterSpacing: '0.16em',
          marginBottom: 16,
        }}>
          Connected Accounts
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {loading ? (
            <p style={{ color: colors.textMuted, fontFamily: fonts.mono, fontSize: 13, padding: '12px 0' }}>Loading accounts...</p>
          ) : Object.keys(grouped).length === 0 ? (
            <p style={{ color: colors.textMuted, fontFamily: fonts.mono, fontSize: 13, padding: '12px 0' }}>No accounts connected yet.</p>
          ) : (
            Object.entries(grouped).map(([institution, accts]) => (
              <InstitutionGroup
                key={institution}
                name={institution}
                accounts={accts}
                onRemove={handleRemove}
                onRemoveInstitution={handleRemoveInstitution}
                authToken={authToken}
              />
            ))
          )}
        </div>
      </MobileCard>

      {/* Connect Account button */}
      <button
        onClick={() => open()}
        disabled={!ready || connecting}
        style={{
          width: '100%',
          minHeight: spacing.tapTarget,
          backgroundColor: colors.gold,
          border: 'none',
          borderRadius: 2,
          color: 'var(--color-surface)',
          fontFamily: fonts.mono,
          fontSize: 13,
          letterSpacing: '0.06em',
          cursor: (!ready || connecting) ? 'not-allowed' : 'pointer',
          opacity: (!ready || connecting) ? 0.6 : 1,
        }}
      >
        {connecting ? 'Connecting...' : '+ Connect Account'}
      </button>
      {connectError && (
        <p style={{ fontFamily: fonts.mono, fontSize: 13, color: colors.negative, textAlign: 'center' }}>
          {connectError}
        </p>
      )}
    </motion.div>
  )
}

function AccountsMobile() {
  return (
    <Suspense fallback={null}>
      <AccountsMobileContent />
    </Suspense>
  )
}

function AccountsDesktop() {
  return (
    <Suspense fallback={null}>
      <AccountsContent />
    </Suspense>
  )
}

export default function AccountsPage() {
  const isMobile = useIsMobile()
  return isMobile ? <AccountsMobile /> : <AccountsDesktop />
}
