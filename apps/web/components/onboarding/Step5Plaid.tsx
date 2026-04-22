'use client'

import { useCallback, useState } from 'react'
import { motion } from 'framer-motion'
import { usePlaidLink } from 'react-plaid-link'
import {
  questionHeading,
  contextCopy,
  continueBtn,
  secondaryBtn,
  fmt,
  opportunityCostOneYear,
} from './shared'
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
  age: number | ''
  annualIncome: number
  savingsRate: number
  retirementAge: number
  isMobile: boolean
}

export function Step5Plaid({
  linkedAccounts,
  onLinked,
  onCompleteAssetLinked,
  onSkipForNow,
  busy = false,
  age,
  annualIncome,
  savingsRate,
  retirementAge,
  isMobile,
}: Props) {
  const { data: linkToken, error: linkTokenError } = usePlaidLinkTokenQuery()
  const exchange = usePlaidExchangeMutation()
  const [exchangeError, setExchangeError] = useState<string | null>(null)
  const [assetRequired, setAssetRequired] = useState(false)
  const exchanging = exchange.isPending
  const linkError = exchangeError ?? (linkTokenError ? 'Could not initialize connection.' : null)
  const setLinkError = setExchangeError

  const ageNum = typeof age === 'number' ? age : 0
  const oppCost = opportunityCostOneYear(ageNum, annualIncome, savingsRate, retirementAge)

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
    [linkedAccounts, onLinked, onCompleteAssetLinked, exchange, setLinkError],
  )

  const { open: openPlaid, ready: plaidReady } = usePlaidLink({
    token: linkToken ?? '',
    onSuccess: handlePlaidSuccess,
  })

  return (
    <div
      style={{
        width: '100%',
        maxWidth: '620px',
        display: 'flex',
        flexDirection: 'column',
        gap: isMobile ? '28px' : '40px',
      }}
    >
      <motion.h1
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        style={questionHeading}
      >
        Turn estimate into fact.
      </motion.h1>

      {oppCost > 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            padding: '22px 24px',
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-gold-border)',
            borderRadius: '2px',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '11px',
              color: 'var(--color-text-muted)',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              fontWeight: 500,
            }}
          >
            The cost of doing nothing, per year
          </span>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 'clamp(40px, 6vw, 56px)',
              fontWeight: 400,
              color: 'var(--color-negative)',
              lineHeight: 1,
              letterSpacing: '-0.01em',
            }}
          >
            {fmt(oppCost)}
          </span>
          <p
            style={{
              ...contextCopy,
              color: 'var(--color-text)',
              fontSize: '15px',
              margin: 0,
            }}
          >
            Every year you don't act, this is the gap between where your money is and where it could be.
          </p>
        </motion.div>
      ) : (
        <p style={contextCopy}>
          Link a checking, savings, or investment account so Illumin can run
          against real balances instead of estimates.
        </p>
      )}

      {assetRequired && (
        <div
          style={{
            padding: '18px 20px',
            backgroundColor: 'var(--color-negative-bg)',
            border: '1px solid var(--color-negative-border)',
            borderRadius: '2px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '11px',
              color: 'var(--color-negative)',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              fontWeight: 600,
            }}
          >
            Asset account required
          </span>
          <p
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '14px',
              color: 'var(--color-text-mid)',
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            Only credit cards came through on that connection. Link a checking,
            savings, or investment account to continue.
          </p>
        </div>
      )}

      {linkedAccounts.length > 0 && (
        <ul
          style={{
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
                padding: '14px 16px',
                border: '1px solid var(--color-border)',
                borderRadius: '2px',
                backgroundColor: 'var(--color-surface)',
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: '13px',
                  color: 'var(--color-text)',
                }}
              >
                {a.institutionName ?? 'Connected account'}
                {a.last4 ? ` •••• ${a.last4}` : ''}
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: '10px',
                  color: a.classification === 'asset' ? 'var(--color-positive)' : 'var(--color-text-muted)',
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  fontWeight: 600,
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
            fontFamily: 'var(--font-sans)',
            fontSize: '13px',
            color: 'var(--color-negative)',
            margin: 0,
          }}
        >
          {linkError}
        </p>
      )}

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          gap: '8px',
        }}
      >
        <button
          type="button"
          onClick={() => openPlaid()}
          disabled={!plaidReady || exchanging || busy}
          style={{
            ...continueBtn,
            opacity: !plaidReady || exchanging || busy ? 0.65 : 1,
            cursor: !plaidReady || exchanging || busy ? 'not-allowed' : 'pointer',
          }}
        >
          {exchanging
            ? 'Linking…'
            : busy
              ? 'Finishing…'
              : assetRequired
                ? 'Link another account'
                : 'Connect your accounts'}
          {!exchanging && !busy && (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          )}
        </button>

        <button
          type="button"
          onClick={onSkipForNow}
          disabled={exchanging || busy}
          style={{
            ...secondaryBtn,
            opacity: exchanging || busy ? 0.45 : 1,
            cursor: exchanging || busy ? 'not-allowed' : 'pointer',
          }}
        >
          Skip for now
        </button>
      </div>

      <ul
        style={{
          listStyle: 'none',
          padding: 0,
          margin: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        {[
          '256-bit encryption. The same standard your bank uses to protect your account.',
          'You log in through Plaid, not Illumin. Illumin never sees or stores your credentials.',
          'Read-only access by design. Illumin can see your accounts but cannot move money, pay bills, or make transfers.',
        ].map(text => (
          <li
            key={text}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontFamily: 'var(--font-sans)',
              fontSize: '12.5px',
              color: 'var(--color-text-muted)',
              letterSpacing: '0.01em',
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-gold)', flexShrink: 0 }}>
              <polyline points="20 6 9 17 4 12" />
            </svg>
            {text}
          </li>
        ))}
      </ul>
    </div>
  )
}
