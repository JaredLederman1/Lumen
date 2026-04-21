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
  isMobile: boolean
}

// Orchestrator-driven sub-steps. The parent owns the global sub-index and
// just tells us which question to render. Each sub-step is one field, one
// question, one Continue. Context copy is declarative, one sentence.
const FIELDS = ['age', 'location', 'income', 'savings', 'retirement'] as const
type FieldKey = typeof FIELDS[number]

const QUESTION: Record<FieldKey, string> = {
  age: 'How old are you?',
  location: 'Where do you live?',
  income: 'What is your annual salary?',
  savings: 'What share of your income do you invest?',
  retirement: 'When do you want to retire?',
}

const CONTEXT: Record<FieldKey, string> = {
  age: 'Your horizon is the single biggest input to every compounding calculation.',
  location: 'State determines the tax advantages Illumin surfaces.',
  income: 'This anchors every calculation you will see in Illumin.',
  savings: 'The rate you save, not the dollar amount, drives retirement outcomes.',
  retirement: 'Changing this by two years can move your wealth trajectory by six figures.',
}

const AGE_MIN = 16
const AGE_MAX = 80

const largeNumericInput = {
  ...textInput,
  minHeight: '72px',
  fontSize: '34px',
  letterSpacing: '-0.01em',
  padding: '14px 18px',
}

export function Step1Basics({ data, onChange, subIndex, onSubAdvance, isMobile }: Props) {
  const key: FieldKey = FIELDS[Math.max(0, Math.min(FIELDS.length - 1, subIndex))]
  const [incomeDisplay, setIncomeDisplay] = useState(
    data.annualIncome > 0 ? formatNumber(data.annualIncome) : ''
  )

  const ageValue = typeof data.age === 'number' ? data.age : null
  const ageOutOfRange =
    ageValue !== null && (ageValue < AGE_MIN || ageValue > AGE_MAX)

  const canAdvance = (() => {
    switch (key) {
      case 'age':
        return ageValue !== null && ageValue >= AGE_MIN && ageValue <= AGE_MAX
      case 'location':
        return data.locationCity.trim().length > 0 && data.locationState.trim().length === 2
      case 'income':
        return data.annualIncome > 0
      case 'savings':
        return data.savingsRate > 0
      case 'retirement':
        return data.retirementAge > 0 && (typeof data.age !== 'number' || data.retirementAge > data.age)
    }
  })()

  let field: React.ReactNode = null
  switch (key) {
    case 'age':
      field = (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <input
            type="number"
            inputMode="numeric"
            className="illumin-no-spin"
            autoFocus
            value={ageValue === null ? '' : String(ageValue)}
            min={AGE_MIN}
            max={AGE_MAX}
            onChange={e => {
              const raw = e.target.value
              if (raw === '') {
                onChange({ age: '' })
                return
              }
              const clean = raw.replace(/[^0-9]/g, '')
              if (clean === '') {
                onChange({ age: '' })
                return
              }
              const n = parseInt(clean, 10)
              if (isNaN(n)) {
                onChange({ age: '' })
                return
              }
              onChange({ age: n })
            }}
            placeholder="32"
            aria-label="Age"
            aria-invalid={ageOutOfRange || undefined}
            style={largeNumericInput}
          />
          {ageOutOfRange && (
            <p
              style={{
                margin: 0,
                fontFamily: 'var(--font-sans)',
                fontSize: '12px',
                color: 'var(--color-text-muted)',
                letterSpacing: '0.02em',
                lineHeight: 1.5,
              }}
            >
              Age must be between {AGE_MIN} and {AGE_MAX}.
            </p>
          )}
        </div>
      )
      break
    case 'location':
      field = (
        <div style={{ display: 'flex', gap: '12px' }}>
          <input
            type="text"
            autoFocus
            value={data.locationCity}
            onChange={e => onChange({ locationCity: e.target.value })}
            placeholder="City"
            aria-label="City"
            style={{ ...textInput, flex: 2 }}
          />
          <input
            type="text"
            value={data.locationState}
            onChange={e => onChange({ locationState: e.target.value.toUpperCase().slice(0, 2) })}
            placeholder="ST"
            aria-label="State"
            maxLength={2}
            style={{ ...textInput, flex: 1, textTransform: 'uppercase', textAlign: 'center' }}
          />
        </div>
      )
      break
    case 'income':
      field = (
        <div style={{ position: 'relative' }}>
          <span
            style={{
              position: 'absolute',
              left: '18px',
              top: '50%',
              transform: 'translateY(-50%)',
              fontFamily: 'var(--font-mono)',
              fontSize: '32px',
              color: 'var(--color-text-muted)',
              pointerEvents: 'none',
            }}
          >
            $
          </span>
          <input
            type="text"
            inputMode="numeric"
            className="illumin-no-spin"
            autoFocus
            value={incomeDisplay}
            onChange={e => {
              const clean = e.target.value.replace(/,/g, '').replace(/[^0-9]/g, '')
              const num = parseInt(clean, 10) || 0
              onChange({ annualIncome: num })
              setIncomeDisplay(num ? formatNumber(num) : '')
            }}
            placeholder="120,000"
            aria-label="Annual salary"
            style={{ ...largeNumericInput, paddingLeft: '46px' }}
          />
        </div>
      )
      break
    case 'savings': {
      const pct = (data.savingsRate / 50) * 100
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
            {data.savingsRate}
            <span style={{ fontSize: '0.5em', color: 'var(--color-text-mid)', marginLeft: '4px' }}>%</span>
          </div>
          <input
            type="range"
            min={0}
            max={50}
            value={data.savingsRate}
            onChange={e => onChange({ savingsRate: Number(e.target.value) })}
            aria-label="Savings rate"
            style={{
              width: '100%',
              background: `linear-gradient(to right, var(--color-gold) ${pct}%, var(--color-border) ${pct}%)`,
            }}
          />
        </div>
      )
      break
    }
    case 'retirement': {
      const pct = ((data.retirementAge - 45) / (75 - 45)) * 100
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
            {data.retirementAge}
            <span style={{ fontSize: '0.35em', color: 'var(--color-text-mid)', marginLeft: '10px' }}>years old</span>
          </div>
          <input
            type="range"
            min={45}
            max={75}
            value={data.retirementAge}
            onChange={e => onChange({ retirementAge: Number(e.target.value) })}
            aria-label="Retirement age"
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
      onAdvance={onSubAdvance}
      isMobile={isMobile}
    >
      {field}
    </SubStepShell>
  )
}
