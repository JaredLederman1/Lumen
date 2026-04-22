'use client'

import { useState } from 'react'
import type { OnboardingData } from './shared'
import { formatNumber, textInput } from './shared'
import { SubStepShell } from './SubStepShell'

interface Props {
  data: OnboardingData
  onChange: (patch: Partial<OnboardingData>) => void
  subIndex: number
  onSubAdvance: () => void
  onSkip?: () => void
  busy?: boolean
  isMobile: boolean
}

const FIELDS = ['retireIncome', 'emergencyFund', 'risk'] as const
type FieldKey = typeof FIELDS[number]

const QUESTION: Record<FieldKey, string> = {
  retireIncome: 'What is your target annual retirement income?',
  emergencyFund: 'How many months of expenses do you want in cash?',
  risk: 'How much volatility are you willing to tolerate?',
}

const CONTEXT: Record<FieldKey, string> = {
  retireIncome: 'The yearly income you want to live on in retirement, in today’s dollars.',
  emergencyFund: 'Most financial advisors recommend 3 to 6 months of essential expenses set aside for emergencies.',
  risk: 'This shapes your target asset mix and the rebalancing nudges Illumin sends you.',
}

const RISK_LABELS: Record<number, string> = {
  1: 'Very conservative',
  2: 'Conservative',
  3: 'Balanced',
  4: 'Aggressive',
  5: 'Very aggressive',
}

const EMERGENCY_FUND_MAX = 24

export function Step4Goals({ data, onChange, subIndex, onSubAdvance, onSkip, busy, isMobile }: Props) {
  const key: FieldKey = FIELDS[Math.max(0, Math.min(FIELDS.length - 1, subIndex))]

  const [incomeDisplay, setIncomeDisplay] = useState(
    data.targetRetirementIncome && data.targetRetirementIncome > 0
      ? formatNumber(data.targetRetirementIncome)
      : ''
  )

  const canAdvance = (() => {
    switch (key) {
      case 'retireIncome':   return (data.targetRetirementIncome ?? 0) > 0
      case 'emergencyFund':  return data.emergencyFundMonthsTarget > 0
      case 'risk':           return data.riskTolerance >= 1 && data.riskTolerance <= 5
    }
  })()

  let field: React.ReactNode = null
  switch (key) {
    case 'retireIncome':
      field = (
        <div style={{ position: 'relative' }}>
          <span
            style={{
              position: 'absolute',
              left: '16px',
              top: '50%',
              transform: 'translateY(-50%)',
              fontFamily: 'var(--font-mono)',
              fontSize: '18px',
              color: 'var(--color-text-muted)',
              pointerEvents: 'none',
            }}
          >
            $
          </span>
          <input
            type="text"
            inputMode="numeric"
            autoFocus
            value={incomeDisplay}
            onChange={e => {
              const clean = e.target.value.replace(/,/g, '').replace(/[^0-9]/g, '')
              const num = parseInt(clean, 10) || 0
              onChange({ targetRetirementIncome: num > 0 ? num : null })
              setIncomeDisplay(num ? formatNumber(num) : '')
            }}
            placeholder="100,000"
            aria-label="Target annual retirement income"
            style={{ ...textInput, paddingLeft: '32px' }}
          />
        </div>
      )
      break
    case 'emergencyFund': {
      const pct = (data.emergencyFundMonthsTarget / EMERGENCY_FUND_MAX) * 100
      field = (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(52px, 10vw, 96px)',
              fontWeight: 300,
              color: 'var(--color-gold)',
              lineHeight: 1,
              letterSpacing: '-0.02em',
            }}
          >
            {data.emergencyFundMonthsTarget}
            <span style={{ fontSize: '0.35em', color: 'var(--color-text-mid)', marginLeft: '10px' }}>months</span>
          </div>
          <input
            type="range"
            min={0}
            max={EMERGENCY_FUND_MAX}
            value={data.emergencyFundMonthsTarget}
            onChange={e => onChange({ emergencyFundMonthsTarget: Number(e.target.value) })}
            aria-label="Emergency fund months"
            style={{
              width: '100%',
              background: `linear-gradient(to right, var(--color-gold) ${pct}%, var(--color-border) ${pct}%)`,
            }}
          />
        </div>
      )
      break
    }
    case 'risk': {
      const pct = ((data.riskTolerance - 1) / 4) * 100
      field = (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(32px, 5.5vw, 52px)',
              fontWeight: 300,
              color: 'var(--color-gold)',
              lineHeight: 1.05,
              letterSpacing: '-0.01em',
            }}
          >
            {RISK_LABELS[data.riskTolerance] ?? 'Balanced'}
          </div>
          <input
            type="range"
            min={1}
            max={5}
            step={1}
            value={data.riskTolerance}
            onChange={e => onChange({ riskTolerance: Number(e.target.value) })}
            aria-label="Risk tolerance"
            style={{
              width: '100%',
              background: `linear-gradient(to right, var(--color-gold) ${pct}%, var(--color-border) ${pct}%)`,
            }}
          />
        </div>
      )
      break
    }
  }

  return (
    <SubStepShell
      question={QUESTION[key]}
      context={CONTEXT[key]}
      canAdvance={canAdvance}
      busy={busy}
      onAdvance={onSubAdvance}
      onSkip={onSkip}
      isMobile={isMobile}
    >
      {field}
    </SubStepShell>
  )
}
