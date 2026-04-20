'use client'

import { useCallback, useState } from 'react'
import { usePlaidLink } from 'react-plaid-link'
import { heading, body, continueBtn } from './shared'
import { usePlaidLinkTokenQuery, usePlaidExchangeMutation } from '@/lib/queries'

export interface LinkedAccount {
  id?: string
  institutionName?: string
  accountType?: string
  classification?: string
  balance?: number
  last4?: string | null
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

interface Props {
  linkedAccounts: LinkedAccount[]
  onLinked: (accounts: LinkedAccount[]) => void
  onCompleteAssetLinked: () => Promise<void> | void
  onSkipForNow: () => Promise<void> | void
  busy?: boolean
}

export function Step5Plaid({
  linkedAccounts,
  onLinked,
  onCompleteAssetLinked,
  onSkipForNow,
  busy = false,
}: Props) {
  const { data: linkToken, error: linkTokenError } = usePlaidLinkTokenQuery()
  const exchange = usePlaidExchangeMutation()
  const [exchangeError, setExchangeError] = useState<string | null>(null)
  const [assetRequired, setAssetRequired] = useState(false)
  const exchanging = exchange.isPending
  const linkError = exchangeError ?? (linkTokenError ? 'Could not initialize connection.' : null)
  const setLinkError = setExchangeError

  const handlePlaidSuccess = useCallback(
    async (publicToken: string, metadata: PlaidOnSuccessMetadata) => {
      setLinkError(null)
      try {
        const data = await exchange.mutateAsync({
          publicToken,
          institutionName: metadata.institution?.name ?? 'Connected Institution',
          accounts: metadata.accounts,
        })
        const newAccounts: LinkedAccount[] = Array.isArray(data?.accounts) ? data.accounts : []
        onLinked(newAccounts)

        const hasAsset = [...linkedAccounts, ...newAccounts].some(
          a => a.classification === 'asset'
        )
        if (hasAsset) {
          setAssetRequired(false)
          await onCompleteAssetLinked()
        } else {
          setAssetRequired(true)
        }
      } catch (err) {
        setLinkError(err instanceof Error ? err.message : 'Could not link account.')
      }
    },
    [linkedAccounts, onLinked, onCompleteAssetLinked, exchange]
  )

  const { open: openPlaid, ready: plaidReady } = usePlaidLink({
    token: linkToken ?? '',
    onSuccess: handlePlaidSuccess,
  })

  return (
    <div>
      <h1 style={heading}>Connect your first account</h1>
      <p style={body}>Link a checking, savings, or investment account.</p>

      {assetRequired && (
        <div
          style={{
            marginTop: '28px',
            padding: '18px 20px',
            backgroundColor: 'var(--color-negative-bg)',
            border: '1px solid var(--color-negative-border)',
            borderRadius: '2px',
          }}
        >
          <p
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              color: 'var(--color-negative)',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              marginBottom: '8px',
            }}
          >
            Asset account required
          </p>
          <p
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              color: 'var(--color-text-mid)',
              lineHeight: 1.7,
              letterSpacing: '0.02em',
              margin: 0,
            }}
          >
            We see the connection, but only credit cards came through. Link a
            checking, savings, or investment account to continue, or skip for now.
          </p>
        </div>
      )}

      {linkedAccounts.length > 0 && (
        <ul
          style={{
            marginTop: '20px',
            padding: 0,
            listStyle: 'none',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          {linkedAccounts.map((a, i) => (
            <li
              key={(a.id ?? '') + i}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 14px',
                border: '1px solid var(--color-border)',
                borderRadius: '2px',
                backgroundColor: 'var(--color-surface)',
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '12px',
                  color: 'var(--color-text)',
                  letterSpacing: '0.02em',
                }}
              >
                {a.institutionName ?? 'Connected account'}
                {a.last4 ? ` •••• ${a.last4}` : ''}
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '10px',
                  color:
                    a.classification === 'asset'
                      ? 'var(--color-positive)'
                      : 'var(--color-text-muted)',
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                }}
              >
                {a.classification === 'asset' ? 'Asset' : 'Credit'}
              </span>
            </li>
          ))}
        </ul>
      )}

      {linkError && (
        <p
          style={{
            marginTop: '16px',
            fontSize: '12px',
            color: 'var(--color-negative)',
            fontFamily: 'var(--font-mono)',
          }}
        >
          {linkError}
        </p>
      )}

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '14px',
          marginTop: '40px',
        }}
      >
        <button
          type="button"
          onClick={() => openPlaid()}
          disabled={!plaidReady || exchanging || busy}
          style={{
            ...continueBtn,
            opacity: (!plaidReady || exchanging || busy) ? 0.65 : 1,
            cursor: (!plaidReady || exchanging || busy) ? 'not-allowed' : 'pointer',
          }}
        >
          {exchanging
            ? 'Linking…'
            : busy
              ? 'Finishing…'
              : assetRequired
                ? 'Link another account'
                : 'Continue'}
        </button>

        <button
          type="button"
          onClick={onSkipForNow}
          disabled={exchanging || busy}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            color: 'var(--color-text-muted)',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            cursor: (exchanging || busy) ? 'not-allowed' : 'pointer',
            opacity: (exchanging || busy) ? 0.5 : 1,
          }}
        >
          Skip for now
        </button>
      </div>
    </div>
  )
}
