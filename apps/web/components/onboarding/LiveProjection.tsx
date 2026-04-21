'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { OnboardingData } from './shared'
import { fmt, projectWealth } from './shared'
import type { LinkedAccount } from './Step5Plaid'
import { useCountUp } from '@/lib/useCountUp'

interface Props {
  data: OnboardingData
  step: number
  linkedAccounts?: LinkedAccount[]
  variant: 'sidecar' | 'sticky-mobile'
}

// Assumed typical 401k employer match as a percentage of salary. Used for the
// "at your employer" callout once the user has entered both salary and
// employer. This is intentionally conservative and labeled as an estimate.
const TYPICAL_MATCH_PCT = 0.04

// Count-up animation: 1.3 seconds total, ease-out. Debounce of 3 seconds
// means the animation only fires after the user stops typing, avoiding a
// spastic re-animation per keystroke.
const COUNT_UP_DURATION_MS = 1300
const DEBOUNCE_MS          = 3000

// Required nest egg for a given retirement income: uses the standard 4%
// withdrawal rule to back into a principal number.
function requiredNestEgg(targetAnnualIncome: number): number {
  if (targetAnnualIncome <= 0) return 0
  return targetAnnualIncome / 0.04
}

/**
 * Accumulating projection card. Hidden until the user types any salary
 * value. After the first appearance, the card remains mounted for the rest
 * of the session: if the salary is cleared, the card shows an empty-state
 * prompt rather than unmounting. The projected wealth number uses a
 * debounced count-up so rapid keystrokes do not trigger a cascade of
 * competing animations.
 */
export function LiveProjection({ data, step, linkedAccounts = [], variant }: Props) {
  const compact = variant === 'sticky-mobile'
  const ageNum = typeof data.age === 'number' ? data.age : 0
  const projectionReady =
    ageNum > 0 &&
    data.annualIncome > 0 &&
    data.savingsRate > 0 &&
    data.retirementAge > ageNum

  const projection = projectionReady
    ? projectWealth(ageNum, data.annualIncome, data.savingsRate, data.retirementAge)
    : 0

  const yearsToRetire = projectionReady ? data.retirementAge - ageNum : 0

  const hasSalary = data.annualIncome > 0

  // Once the user has ever typed a salary, the card stays mounted. It never
  // re-hides, only swaps its content to the empty state. The conditional
  // setState during render is the canonical pattern for deriving state from
  // props (see React docs: "Storing information from previous renders").
  const [hasAppeared, setHasAppeared] = useState<boolean>(hasSalary)
  if (hasSalary && !hasAppeared) setHasAppeared(true)

  // Debounced count-up. Target is 0 whenever the card is in empty state or
  // projection is not yet computable; otherwise the full projection. The
  // 3-second debounce holds the displayed number static while the user
  // types, and the animation only fires after they stop.
  const animated = useCountUp(projection, COUNT_UP_DURATION_MS, false, DEBOUNCE_MS)

  const showEmployerMatch =
    step >= 1 &&
    hasSalary &&
    data.employer.trim().length > 0
  const annualMatch = data.annualIncome * TYPICAL_MATCH_PCT

  const showGoalGap =
    step >= 3 &&
    projectionReady &&
    (data.targetRetirementIncome ?? 0) > 0
  const required = showGoalGap ? requiredNestEgg(data.targetRetirementIncome!) : 0
  const goalGap = showGoalGap ? projection - required : 0

  const showAccounts = step >= 4 && linkedAccounts.length > 0

  if (!hasAppeared) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      style={{
        padding: compact ? '14px 16px' : '24px 22px',
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: '4px',
        display: 'flex',
        flexDirection: 'column',
        gap: compact ? '10px' : '18px',
        width: compact ? '100%' : 'max-content',
        minWidth: compact ? undefined : '100%',
        maxWidth: '100%',
      }}
    >
      <p
        style={{
          margin: 0,
          fontFamily: 'var(--font-sans)',
          fontSize: '10.5px',
          color: 'var(--color-text-muted)',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          fontWeight: 500,
          whiteSpace: 'nowrap',
        }}
      >
        Projected retirement wealth
      </p>

      {hasSalary ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: compact ? '4px' : '8px' }}>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: compact ? '24px' : '40px',
              fontWeight: 400,
              color: 'var(--color-gold)',
              lineHeight: 1,
              letterSpacing: '-0.01em',
              whiteSpace: 'nowrap',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {fmt(Math.round(animated))}
          </span>
          {!compact && projectionReady && (
            <span
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: '12px',
                color: 'var(--color-text-muted)',
                lineHeight: 1.4,
              }}
            >
              Over {yearsToRetire} years at 7% real return.
            </span>
          )}
        </div>
      ) : (
        <p
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: compact ? '12px' : '13px',
            color: 'var(--color-text-muted)',
            lineHeight: 1.5,
            margin: 0,
            maxWidth: compact ? undefined : '260px',
          }}
        >
          Enter your salary to see your wealth at retirement.
        </p>
      )}

      {!compact && (
        <AnimatePresence initial={false}>
          {showEmployerMatch && (
            <motion.div
              key="employer-match"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              style={{ overflow: 'hidden' }}
            >
              <ProjectionRow
                label={`Typical 401k match at ${data.employer || 'your employer'}`}
                value={fmt(annualMatch)}
                hint="4% of salary, a common benchmark."
              />
            </motion.div>
          )}
          {showGoalGap && (
            <motion.div
              key="goal-gap"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              style={{ overflow: 'hidden' }}
            >
              <ProjectionRow
                label={goalGap >= 0 ? 'Above your retirement target' : 'Short of your retirement target'}
                value={fmt(Math.abs(goalGap))}
                tone={goalGap >= 0 ? 'positive' : 'negative'}
                hint={`Target nest egg: ${fmt(required)}.`}
              />
            </motion.div>
          )}
          {showAccounts && (
            <motion.div
              key="accounts"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              style={{ overflow: 'hidden' }}
            >
              <ProjectionRow
                label="Accounts linked"
                value={`${linkedAccounts.length}`}
                hint="Your dashboard starts loading real balances next."
              />
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </motion.div>
  )
}

function ProjectionRow({
  label,
  value,
  hint,
  tone = 'neutral',
}: {
  label: string
  value: string
  hint?: string
  tone?: 'neutral' | 'positive' | 'negative'
}) {
  const color =
    tone === 'positive' ? 'var(--color-positive)' :
    tone === 'negative' ? 'var(--color-negative)' :
    'var(--color-text)'

  return (
    <div
      style={{
        paddingTop: '16px',
        borderTop: '1px solid var(--color-border)',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
      }}
    >
      <span
        style={{
          fontFamily: 'var(--font-sans)',
          fontSize: '11px',
          color: 'var(--color-text-muted)',
          letterSpacing: '0.08em',
          lineHeight: 1.4,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '18px',
          fontWeight: 400,
          color,
          lineHeight: 1.1,
          whiteSpace: 'nowrap',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </span>
      {hint && (
        <span
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: '11px',
            color: 'var(--color-text-muted)',
            lineHeight: 1.45,
          }}
        >
          {hint}
        </span>
      )}
    </div>
  )
}
