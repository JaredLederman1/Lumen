'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { usePlaidLink } from 'react-plaid-link'
import {
  questionHeading,
  contextCopy,
  continueBtn,
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

const STAGE = {
  EYEBROW: 1,
  HERO: 2,
  LINE_1: 3,
  LINE_3: 4,
  BUTTON: 5,
} as const

const REVEAL_DELAYS: Record<number, number> = {
  [STAGE.EYEBROW]: 0,
  [STAGE.HERO]: 800,
  [STAGE.LINE_1]: 1800,
  [STAGE.LINE_3]: 3000,
  [STAGE.BUTTON]: 4200,
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

  const [screen, setScreen] = useState<1 | 2>(1)
  const [stage, setStage] = useState(0)
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([])

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

  const fastForward = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout)
    timeoutsRef.current = []
    setStage(STAGE.BUTTON)
  }, [])

  // Drive the stage timeline when screen 2 mounts. Also listen for any key to
  // fast-forward. Click-to-fast-forward is wired on the overlay container.
  useEffect(() => {
    if (screen !== 2) return
    setStage(0)
    const scheduled: ReturnType<typeof setTimeout>[] = []
    for (const s of [STAGE.EYEBROW, STAGE.HERO, STAGE.LINE_1, STAGE.LINE_3, STAGE.BUTTON]) {
      const id = setTimeout(() => setStage(s), REVEAL_DELAYS[s])
      scheduled.push(id)
    }
    timeoutsRef.current = scheduled

    const onKey = () => fastForward()
    window.addEventListener('keydown', onKey)
    return () => {
      scheduled.forEach(clearTimeout)
      timeoutsRef.current = []
      window.removeEventListener('keydown', onKey)
    }
  }, [screen, fastForward])

  // Plaid error / asset-required states are surfaced on screen 1. If either
  // fires while the user is on screen 2, bounce back so the warning is seen.
  useEffect(() => {
    if ((assetRequired || linkError) && screen === 2) setScreen(1)
  }, [assetRequired, linkError, screen])

  return (
    <>
      <AnimatePresence>
        {screen === 1 && (
          <motion.div
            key="screen-1"
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
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
              }}
            >
              <button
                type="button"
                onClick={() => {
                  if (assetRequired) {
                    openPlaid()
                  } else {
                    setScreen(2)
                  }
                }}
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
                      : 'Close the gap'}
                {!exchanging && !busy && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {screen === 2 && (
        <div
          onClick={fastForward}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'var(--color-bg)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'flex-start',
            paddingTop: isMobile ? '18vh' : '22vh',
            paddingLeft: '24px',
            paddingRight: '24px',
            zIndex: 80,
            cursor: stage < STAGE.BUTTON ? 'pointer' : 'default',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '640px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '22px',
              textAlign: 'center',
            }}
          >
            {stage >= STAGE.EYEBROW && (
              <Fade>
                <span
                  style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: '11px',
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    fontWeight: 500,
                    color: 'var(--color-text-muted)',
                  }}
                >
                  How this works
                </span>
              </Fade>
            )}

            {stage >= STAGE.HERO && (
              <Fade>
                <p
                  style={{
                    margin: 0,
                    paddingTop: '10px',
                    paddingBottom: '10px',
                    fontFamily: 'var(--font-display)',
                    fontSize: 'clamp(22px, 3.2vw, 26px)',
                    fontWeight: 400,
                    lineHeight: 1.25,
                    letterSpacing: '-0.005em',
                    color: 'var(--color-text)',
                  }}
                >
                  Your bank password gets typed into your bank's interface, not Illumin's. We never see it.
                </p>
              </Fade>
            )}

            {stage >= STAGE.LINE_1 && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                  width: '100%',
                  maxWidth: '460px',
                }}
              >
                <Fade>
                  <CheckmarkRow>
                    256-bit encryption. The same standard your bank uses.
                  </CheckmarkRow>
                </Fade>
                {stage >= STAGE.LINE_3 && (
                  <Fade>
                    <CheckmarkRow>
                      Read-only access. Illumin cannot move money, pay bills, or transfer funds.
                    </CheckmarkRow>
                  </Fade>
                )}
              </div>
            )}

            {stage >= STAGE.BUTTON && (
              <Fade>
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation()
                    openPlaid()
                  }}
                  disabled={!plaidReady || exchanging || busy}
                  style={{
                    ...continueBtn,
                    marginTop: '22px',
                    opacity: !plaidReady || exchanging || busy ? 0.65 : 1,
                    cursor: !plaidReady || exchanging || busy ? 'not-allowed' : 'pointer',
                  }}
                >
                  {exchanging ? 'Linking…' : busy ? 'Finishing…' : 'Connect via Plaid'}
                  {!exchanging && !busy && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12" />
                      <polyline points="12 5 19 12 12 19" />
                    </svg>
                  )}
                </button>
              </Fade>
            )}
          </div>

        </div>
      )}
    </>
  )
}

// Simple opacity fade-in on mount. Each reveal stage conditionally mounts its
// element, so this only animates on first appearance.
function Fade({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}

function CheckmarkRow({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        textAlign: 'left',
        width: '100%',
      }}
    >
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ color: 'var(--color-gold)', flexShrink: 0, marginTop: '6px' }}
      >
        <polyline points="20 6 9 17 4 12" />
      </svg>
      <p
        style={{
          margin: 0,
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(15px, 1.6vw, 17px)',
          lineHeight: 1.4,
          color: 'var(--color-text)',
          fontWeight: 400,
        }}
      >
        {children}
      </p>
    </div>
  )
}
