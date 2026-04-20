'use client'

import { useState, useRef, Suspense, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { usePlaidLink } from 'react-plaid-link'
import AccountCard from '@/components/ui/AccountCard'
import DataTooltip from '@/components/ui/DataTooltip'
import { useDashboard } from '@/lib/dashboardData'
import {
  useDeleteInstitutionMutation,
  usePlaidLinkTokenQuery,
  usePlaidExchangeMutation,
  usePlaidSyncMutation,
  usePlaidResetMutation,
} from '@/lib/queries'
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
}: {
  name: string
  accounts: Account[]
  onRemove: (id: string) => void
  onRemoveInstitution: (institutionName: string) => void
}) {
  const [open, setOpen] = useState(true)
  const [confirmRemoveAll, setConfirmRemoveAll] = useState(false)
  const deleteInstitution = useDeleteInstitutionMutation()
  const removingAll = deleteInstitution.isPending
  const total = accounts.reduce((s, a) => s + a.balance, 0)
  const initials = getInitials(name)

  const handleRemoveInstitution = () => {
    deleteInstitution.mutate(name, {
      onSuccess: () => {
        onRemoveInstitution(name)
        setConfirmRemoveAll(false)
      },
      onError: () => setConfirmRemoveAll(false),
    })
  }

  return (
    <div style={{ border: '1px solid var(--color-gold-border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', opacity: removingAll ? 0.4 : 1, transition: 'opacity 200ms ease' }}>
      <div
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', backgroundColor: 'var(--color-surface)',
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
  onConnecting,
}: {
  onSuccess: (accounts: Account[]) => void
  onConnecting?: () => void
}) {
  const { data: linkToken, error: linkTokenError } = usePlaidLinkTokenQuery()
  const exchange = usePlaidExchangeMutation()
  const [error, setError] = useState<string | null>(null)
  const onConnectingRef = useRef(onConnecting)
  onConnectingRef.current = onConnecting
  const onSuccessRef = useRef(onSuccess)
  onSuccessRef.current = onSuccess

  useEffect(() => {
    if (linkTokenError) setError(`Could not initialize connection: ${linkTokenError.message}`)
    else setError(null)
  }, [linkTokenError])

  const handlePlaidSuccess = useCallback(
    (publicToken: string, metadata: PlaidOnSuccessMetadata) => {
      setError(null)
      onConnectingRef.current?.()
      exchange.mutate(
        {
          publicToken,
          institutionName: metadata.institution?.name ?? 'Connected Institution',
          accounts: metadata.accounts,
        },
        {
          onSuccess: data => onSuccessRef.current((data?.accounts as Account[]) ?? []),
          onError: err => setError(err instanceof Error ? err.message : 'Connection failed'),
        },
      )
    },
    [exchange],
  )

  const { open, ready } = usePlaidLink({
    token: linkToken ?? '',
    onSuccess: handlePlaidSuccess,
    onExit: (err) => {
      if (err) console.error('[Plaid Link exit error]', JSON.stringify(err, null, 2))
    },
  })

  const connecting = exchange.isPending

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
function useMobilePlaidConnect(onSuccess: (accounts: Account[]) => void, onConnecting?: () => void) {
  const { data: linkToken, error: linkTokenError } = usePlaidLinkTokenQuery()
  const exchange = usePlaidExchangeMutation()
  const [error, setError] = useState<string | null>(null)
  const onConnectingRef = useRef(onConnecting)
  onConnectingRef.current = onConnecting
  const onSuccessRef = useRef(onSuccess)
  onSuccessRef.current = onSuccess

  useEffect(() => {
    if (linkTokenError) setError(`Could not initialize connection: ${linkTokenError.message}`)
    else setError(null)
  }, [linkTokenError])

  const handlePlaidSuccess = useCallback(
    (publicToken: string, metadata: PlaidOnSuccessMetadata) => {
      setError(null)
      onConnectingRef.current?.()
      exchange.mutate(
        {
          publicToken,
          institutionName: metadata.institution?.name ?? 'Connected Institution',
          accounts: metadata.accounts,
        },
        {
          onSuccess: data => onSuccessRef.current((data?.accounts as Account[]) ?? []),
          onError: err => setError(err instanceof Error ? err.message : 'Connection failed'),
        },
      )
    },
    [exchange],
  )

  const { open, ready } = usePlaidLink({
    token: linkToken ?? '',
    onSuccess: handlePlaidSuccess,
    onExit: (err) => {
      if (err) console.error('[Plaid Link exit error]', JSON.stringify(err, null, 2))
    },
  })

  return { open, ready, connecting: exchange.isPending, error }
}

const SYNC_STEPS = [
  'Connecting to your institution...',
  'Verifying credentials...',
  'Retrieving account details...',
  'Fetching balances...',
  'Syncing recent transactions...',
  'Almost there...',
]

function SyncingOverlay({ done }: { done: boolean }) {
  const [progress, setProgress] = useState(0)
  const [stepIndex, setStepIndex] = useState(0)

  useEffect(() => {
    if (done) {
      setProgress(100)
      setStepIndex(SYNC_STEPS.length - 1)
      return
    }
    // Simulate progress: fast at first, slows down, never exceeds 92 until done
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 92) return prev
        const remaining = 92 - prev
        const increment = Math.max(0.3, remaining * 0.04)
        return Math.min(92, prev + increment)
      })
    }, 150)
    return () => clearInterval(interval)
  }, [done])

  useEffect(() => {
    if (done) {
      setStepIndex(SYNC_STEPS.length - 1)
      return
    }
    // Advance step label based on progress thresholds
    if (progress < 12) setStepIndex(0)
    else if (progress < 30) setStepIndex(1)
    else if (progress < 50) setStepIndex(2)
    else if (progress < 70) setStepIndex(3)
    else if (progress < 88) setStepIndex(4)
    else setStepIndex(5)
  }, [progress, done])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        backgroundColor: 'rgba(8, 10, 14, 0.88)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '28px',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <p style={{
          fontFamily: 'var(--font-serif)', fontSize: '22px', color: '#F0F2F8',
          fontWeight: 400, marginBottom: '6px',
        }}>
          Syncing your accounts
        </p>
        <p style={{
          fontFamily: 'var(--font-mono)', fontSize: '12px', color: '#6B7A8D',
          letterSpacing: '0.06em', height: '18px',
        }}>
          {SYNC_STEPS[stepIndex]}
        </p>
      </div>

      {/* Progress bar */}
      <div style={{ width: '320px', maxWidth: '80vw' }}>
        <div style={{
          width: '100%', height: '4px', borderRadius: '2px',
          backgroundColor: 'rgba(184,145,58,0.12)',
          overflow: 'hidden',
        }}>
          <motion.div
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            style={{
              height: '100%', borderRadius: '2px',
              backgroundColor: '#B8913A',
            }}
          />
        </div>
        <p style={{
          fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#6B7A8D',
          letterSpacing: '0.08em', textAlign: 'right', marginTop: '8px',
        }}>
          {Math.round(progress)}%
        </p>
      </div>
    </motion.div>
  )
}

function AccountsContent() {
  const { loading, accounts } = useDashboard()
  const sync = usePlaidSyncMutation()
  const [syncing, setSyncing] = useState(false)
  const [syncDone, setSyncDone] = useState(false)
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Mutation invalidates the accounts query; the UI updates via the cache.
  const handleRemove = () => {}
  const handleRemoveInstitution = () => {}

  const handleConnectSuccess = (newAccounts: Account[]) => {
    sync.mutate(undefined, {
      onSettled: () => {
        setSyncDone(true)
        setTimeout(() => {
          setSyncing(false)
          setSyncDone(false)
          setBanner({ type: 'success', message: `${newAccounts.length} account${newAccounts.length !== 1 ? 's' : ''} connected successfully.` })
        }, 800)
      },
    })
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

  const card = { backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-gold-border)', borderRadius: 'var(--radius-lg)', padding: '28px' } as const
  const labelStyle = { fontFamily: 'var(--font-sans)', fontSize: '11px', fontWeight: 500, color: 'var(--color-text-muted)', textTransform: 'uppercase' as const, letterSpacing: '0.06em' } as const

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <AnimatePresence>
        {syncing && <SyncingOverlay done={syncDone} />}
      </AnimatePresence>
      {banner && (
        <div style={{
          padding: '13px 18px',
          backgroundColor: banner.type === 'success' ? 'var(--color-positive-bg)' : 'var(--color-negative-bg)',
          border: `1px solid ${banner.type === 'success' ? 'var(--color-positive-border)' : 'var(--color-negative-border)'}`,
          borderRadius: 'var(--radius-md)',
          color: banner.type === 'success' ? 'var(--color-positive)' : 'var(--color-negative)',
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
            <div style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-gold-border)', borderRadius: 'var(--radius-lg)', padding: '24px' }}>
              <p style={{ ...labelStyle, marginBottom: '10px' }}>Total Assets</p>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '41px', fontWeight: 400, color: 'var(--color-positive)' }}>
                <DataTooltip
                  value={animatedAssets}
                  title="Total Assets"
                  computationNote="Sum of all asset-classified accounts"
                  sources={assetSources}
                  accentColor="var(--color-positive)"
                />
              </p>
            </div>
            <div style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-gold-border)', borderRadius: 'var(--radius-lg)', padding: '24px' }}>
              <p style={{ ...labelStyle, marginBottom: '10px' }}>Total Liabilities</p>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '41px', fontWeight: 400, color: 'var(--color-negative)' }}>
                <DataTooltip
                  value={animatedLiabilities}
                  title="Total Liabilities"
                  computationNote="Sum of all liability-classified accounts (shown as positive values)"
                  sources={liabilitySources}
                  accentColor="var(--color-negative)"
                />
              </p>
            </div>
            <div style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-gold-border)', borderRadius: 'var(--radius-lg)', padding: '24px' }}>
              <p style={{ ...labelStyle, marginBottom: '10px' }}>Net Worth</p>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '41px', fontWeight: 400, color: 'var(--color-gold)' }}>
                <DataTooltip
                  value={animatedNetWorth}
                  title="Net Worth"
                  computationNote="Total assets minus total liabilities across all connected accounts"
                  sources={netWorthSources}
                  accentColor="var(--color-gold)"
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

          <ConnectButton onSuccess={handleConnectSuccess} onConnecting={() => setSyncing(true)} />
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
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}

function AccountsMobileContent() {
  const { loading, accounts } = useDashboard()
  const sync = usePlaidSyncMutation()
  const [syncing, setSyncing] = useState(false)
  const [syncDone, setSyncDone] = useState(false)
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const handleRemove = () => {}
  const handleRemoveInstitution = () => {}

  const handleConnectSuccess = (newAccounts: Account[]) => {
    sync.mutate(undefined, {
      onSettled: () => {
        setSyncDone(true)
        setTimeout(() => {
          setSyncing(false)
          setSyncDone(false)
          setBanner({ type: 'success', message: `${newAccounts.length} account${newAccounts.length !== 1 ? 's' : ''} connected successfully.` })
        }, 800)
      },
    })
  }

  const { open, ready, connecting, error: connectError } = useMobilePlaidConnect(handleConnectSuccess, () => setSyncing(true))

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
      <AnimatePresence>
        {syncing && <SyncingOverlay done={syncDone} />}
      </AnimatePresence>
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
