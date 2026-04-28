'use client'

// Bespoke layout. Step 5 multi-screen flow + Plaid Link integration cannot use SubStepShell.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  animate,
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from 'framer-motion'
import { usePlaidLink } from 'react-plaid-link'
import {
  Area,
  ComposedChart,
  Line,
  ResponsiveContainer,
  XAxis,
} from 'recharts'
import {
  questionHeading,
  contextCopy,
  continueBtn,
  fmt,
  projectWealth,
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
  targetRetirementIncome: number | null
  isMobile: boolean | null
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

// The whole card fades from 0→1 over CARD_FADE_MS before any internal
// animation begins. The per-day count-up starts 200ms after that fade so
// the eye lands on the gold figure once the card is fully present. The
// chart drives its own animations via recharts: the two trajectory lines
// begin at chart mount, and the gold gap fill starts CHART_FILL_BEGIN_MS
// later so the user reads divergence first, then watches the gap fill in.
const CARD_FADE_MS           = 400
const PER_DAY_DELAY_MS       = CARD_FADE_MS + 200
const PER_DAY_DURATION_MS    = 1400
const CHART_LINE_DURATION_MS = 1800
const CHART_FILL_BEGIN_MS    = 400
const CHART_FILL_DURATION_MS = 1800

export function Step5Plaid({
  linkedAccounts,
  onLinked,
  onCompleteAssetLinked,
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

  const reducedMotion = useReducedMotion() ?? false

  // Math for the time-decomposed loss readout. Reuses projectWealth from
  // shared.ts. The current rate is floored at 5 (the new default) so
  // pre-onboarding zeros and sub-5 entries map onto a meaningful baseline.
  // The optimized rate is always 10 points above current, never less than
  // 15, so the gap always represents a real step up.
  const ageNum = typeof age === 'number' ? age : 0
  const yearsToRetire = retirementAge - ageNum
  const projectionImpossible = yearsToRetire <= 0

  const currentRate = Math.max(savingsRate || 0, 5)
  const optimizedRate = Math.max(currentRate + 10, 15)

  const currentTotal = projectionImpossible
    ? 0
    : projectWealth(ageNum, annualIncome, currentRate, retirementAge)
  const optimizedTotal = projectionImpossible
    ? 0
    : projectWealth(ageNum, annualIncome, optimizedRate, retirementAge)
  const lifetimeGap = Math.max(0, optimizedTotal - currentTotal)

  const perDay = projectionImpossible ? 0 : Math.round(lifetimeGap / (yearsToRetire * 365))
  const perMonth = projectionImpossible ? 0 : Math.round(lifetimeGap / (yearsToRetire * 12))
  const perYear = projectionImpossible ? 0 : Math.round(lifetimeGap / yearsToRetire)

  // Per-year sample of both trajectories from year 0 to year `yearsToRetire`
  // for the chart. Memoized so recharts only re-mounts the animation when
  // an upstream input actually changes.
  const chartData = useMemo(() => {
    if (projectionImpossible) {
      return [] as Array<{ year: number; currentPath: number; optimizedPath: number; gap: number }>
    }
    const points: Array<{ year: number; currentPath: number; optimizedPath: number; gap: number }> = []
    for (let y = 0; y <= yearsToRetire; y++) {
      const cur = projectWealth(ageNum, annualIncome, currentRate, ageNum + y)
      const opt = projectWealth(ageNum, annualIncome, optimizedRate, ageNum + y)
      points.push({
        year: y,
        currentPath: cur,
        optimizedPath: opt,
        gap: Math.max(0, opt - cur),
      })
    }
    return points
  }, [projectionImpossible, yearsToRetire, ageNum, annualIncome, currentRate, optimizedRate])

  const midYear = Math.round(yearsToRetire / 2)
  const tickFormatter = useCallback(
    (v: number) => (v === 0 ? 'Today' : `Year ${v}`),
    [],
  )

  // Treat the unmeasured first paint (isMobile === null) as mobile so the
  // stacked layout is the safer default before hydration measures the
  // viewport.
  const stackOnMobile = isMobile === true || isMobile === null
  const chartHeight = stackOnMobile ? 200 : 280

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
              maxWidth: '740px',
              display: 'flex',
              flexDirection: 'column',
              gap: stackOnMobile ? '24px' : '32px',
            }}
          >
            <motion.h1
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              style={questionHeading}
            >
              This is what's at stake.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
              style={contextCopy}
            >
              Every day you wait, the gap between your current path and your
              optimized path grows. Linking your accounts is the first step to
              closing it.
            </motion.p>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: CARD_FADE_MS / 1000, ease: [0.22, 1, 0.36, 1] }}
              style={{
                padding: stackOnMobile ? '24px 18px' : '36px 28px',
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-gold-border)',
                borderRadius: '2px',
              }}
            >
              {projectionImpossible ? (
                <p
                  style={{
                    ...contextCopy,
                    textAlign: 'center',
                    margin: 0,
                  }}
                >
                  Adjust your retirement age to see this projection.
                </p>
              ) : (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: stackOnMobile ? 'column' : 'row',
                    alignItems: 'stretch',
                    gap: stackOnMobile ? '24px' : '32px',
                  }}
                >
                  <LossReadout
                    perDay={perDay}
                    perMonth={perMonth}
                    perYear={perYear}
                    lifetimeGap={lifetimeGap}
                    yearsToRetire={yearsToRetire}
                    reducedMotion={reducedMotion}
                    stackOnMobile={stackOnMobile}
                  />
                  <div
                    style={{
                      flex: stackOnMobile ? '1 1 auto' : '1 1 60%',
                      minWidth: 0,
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <ResponsiveContainer width="100%" height={chartHeight}>
                      <ComposedChart
                        data={chartData}
                        margin={{ top: 8, right: 12, bottom: 0, left: 0 }}
                      >
                        <XAxis
                          dataKey="year"
                          type="number"
                          domain={[0, yearsToRetire]}
                          ticks={[0, midYear, yearsToRetire]}
                          tickFormatter={tickFormatter}
                          tick={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: 11,
                            fill: 'var(--color-text-muted)',
                          }}
                          axisLine={false}
                          tickLine={false}
                        />

                        {/* Stacked Areas paint the gold gap region between
                            the two trajectories. Strokes are suppressed
                            here so the trajectory lines below can animate
                            on their own schedule (lines first, fill 400ms
                            later). */}
                        <Area
                          type="monotone"
                          dataKey="currentPath"
                          stackId="gap-fill"
                          stroke="none"
                          fill="transparent"
                          isAnimationActive={!reducedMotion}
                          animationBegin={CHART_FILL_BEGIN_MS}
                          animationDuration={CHART_FILL_DURATION_MS}
                          animationEasing="ease-out"
                        />
                        <Area
                          type="monotone"
                          dataKey="gap"
                          stackId="gap-fill"
                          stroke="none"
                          fill="var(--color-gold)"
                          fillOpacity={0.12}
                          isAnimationActive={!reducedMotion}
                          animationBegin={CHART_FILL_BEGIN_MS}
                          animationDuration={CHART_FILL_DURATION_MS}
                          animationEasing="ease-out"
                        />

                        <Line
                          type="monotone"
                          dataKey="currentPath"
                          stroke="var(--color-text-muted)"
                          strokeWidth={1.5}
                          dot={false}
                          isAnimationActive={!reducedMotion}
                          animationDuration={CHART_LINE_DURATION_MS}
                          animationEasing="ease-out"
                        />
                        <Line
                          type="monotone"
                          dataKey="optimizedPath"
                          stroke="var(--color-gold)"
                          strokeWidth={2}
                          dot={false}
                          isAnimationActive={!reducedMotion}
                          animationDuration={CHART_LINE_DURATION_MS}
                          animationEasing="ease-out"
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </motion.div>

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
                  ...continueBtn(),
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
            paddingTop: isMobile !== false ? '18vh' : '22vh',
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
                    ...continueBtn(),
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

interface LossReadoutProps {
  perDay: number
  perMonth: number
  perYear: number
  lifetimeGap: number
  yearsToRetire: number
  reducedMotion: boolean
  stackOnMobile: boolean
}

function LossReadout({
  perDay,
  perMonth,
  perYear,
  lifetimeGap,
  yearsToRetire,
  reducedMotion,
  stackOnMobile,
}: LossReadoutProps) {
  const rows: Array<{ label: string; value: string }> = [
    { label: 'PER MONTH', value: fmt(perMonth) },
    { label: 'PER YEAR', value: fmt(perYear) },
    { label: `OVER ${yearsToRetire} YEARS`, value: fmt(Math.round(lifetimeGap)) },
  ]

  return (
    <div
      style={{
        flex: stackOnMobile ? '1 1 auto' : '0 0 40%',
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: stackOnMobile ? '20px' : '24px',
      }}
    >
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '10.5px',
          color: 'var(--color-text-muted)',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          fontWeight: 500,
        }}
      >
        What waiting costs you
      </span>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          minWidth: 0,
        }}
      >
        <PerDayHero value={perDay} reducedMotion={reducedMotion} />
        <span
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 'clamp(14px, 1.6vw, 17px)',
            fontWeight: 400,
            color: 'var(--color-text-muted)',
            lineHeight: 1.2,
            letterSpacing: '0.005em',
          }}
        >
          every day
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {rows.map((row, i) => (
          <div
            key={row.label}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              gap: '12px',
              paddingTop: i === 0 ? 0 : 12,
              paddingBottom: i === rows.length - 1 ? 0 : 12,
              borderTop: i === 0 ? 'none' : '1px solid var(--color-border)',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '10.5px',
                color: 'var(--color-text-muted)',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                fontWeight: 500,
              }}
            >
              {row.label}
            </span>
            <span
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: '14px',
                color: 'var(--color-text-muted)',
                fontVariantNumeric: 'tabular-nums',
                whiteSpace: 'nowrap',
              }}
            >
              {row.value}
            </span>
          </div>
        ))}
      </div>

      <span
        style={{
          fontFamily: 'var(--font-sans)',
          fontSize: '11px',
          color: 'var(--color-text-muted)',
          lineHeight: 1.5,
          letterSpacing: '0.01em',
        }}
      >
        Assumes 7% real return at current vs optimized savings rate.
      </span>
    </div>
  )
}

interface PerDayHeroProps {
  value: number
  reducedMotion: boolean
}

// Count-up tween from 0 to the per-day value, formatted via `fmt` on each
// frame. Honors prefers-reduced-motion by snapping straight to the final
// value. Re-runs whenever the target value changes so upstream input edits
// still reflow the figure.
function PerDayHero({ value, reducedMotion }: PerDayHeroProps) {
  const count = useMotionValue(reducedMotion ? value : 0)
  const formatted = useTransform(count, latest => fmt(Math.round(latest)))

  useEffect(() => {
    if (reducedMotion) {
      count.set(value)
      return
    }
    count.set(0)
    const controls = animate(count, value, {
      duration: PER_DAY_DURATION_MS / 1000,
      delay: PER_DAY_DELAY_MS / 1000,
      ease: 'easeOut',
    })
    return () => controls.stop()
  }, [value, reducedMotion, count])

  return (
    <motion.span
      style={{
        fontFamily: 'var(--font-serif)',
        // Hero figure capped at 64px so a 6-character value ($X,XXX or
        // $9,999) fits inside the ~273px left column on desktop without
        // truncation. Min 44px keeps it dominant on a 375px viewport.
        fontSize: 'clamp(44px, 6.4vw, 64px)',
        fontWeight: 400,
        color: 'var(--color-gold)',
        lineHeight: 1,
        letterSpacing: '-0.02em',
        fontVariantNumeric: 'tabular-nums',
        whiteSpace: 'nowrap',
      }}
    >
      {formatted}
    </motion.span>
  )
}
