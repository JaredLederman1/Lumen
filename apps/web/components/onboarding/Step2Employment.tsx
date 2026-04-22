'use client'

import type { OnboardingData } from './shared'
import { textInput } from './shared'
import { SubStepShell } from './SubStepShell'
import { Autocomplete } from './Autocomplete'
import { COMMON_JOB_TITLES } from './jobTitleData'

interface Props {
  data: OnboardingData
  onChange: (patch: Partial<OnboardingData>) => void
  subIndex: number
  onSubAdvance: () => void
  onSkip?: () => void
  busy?: boolean
  isMobile: boolean
}

const FIELDS = ['title', 'employer', 'startDate'] as const
type FieldKey = typeof FIELDS[number]

const QUESTION: Record<FieldKey, string> = {
  title: 'What do you do for a living?',
  employer: 'Who do you work for?',
  startDate: 'When did you start there?',
}

const CONTEXT: Record<FieldKey, string> = {
  title: 'Your role tells Illumin which compensation patterns to look for.',
  employer: 'We use this to match typical benefits and match rates for your employer size.',
  startDate: 'Tenure determines vesting, bonus timing, and match eligibility.',
}

export function Step2Employment({ data, onChange, subIndex, onSubAdvance, onSkip, busy, isMobile }: Props) {
  const key: FieldKey = FIELDS[Math.max(0, Math.min(FIELDS.length - 1, subIndex))]

  const canAdvance = (() => {
    switch (key) {
      case 'title':     return data.jobTitle.trim().length > 0
      case 'employer':  return data.employer.trim().length > 0
      case 'startDate': return data.employerStartDate.trim().length > 0
    }
  })()

  let field: React.ReactNode = null
  switch (key) {
    case 'title':
      field = (
        <Autocomplete
          value={data.jobTitle}
          onChange={v => onChange({ jobTitle: v })}
          options={COMMON_JOB_TITLES.map(t => ({ value: t }))}
          placeholder="Software Engineer"
          ariaLabel="Job title"
          autoFocus
        />
      )
      break
    case 'employer':
      field = (
        <input
          type="text"
          autoFocus
          value={data.employer}
          onChange={e => onChange({ employer: e.target.value })}
          placeholder="Company name"
          aria-label="Employer"
          style={textInput}
        />
      )
      break
    case 'startDate':
      field = (
        <input
          type="date"
          autoFocus
          value={data.employerStartDate}
          onChange={e => onChange({ employerStartDate: e.target.value })}
          aria-label="Employer start date"
          style={textInput}
        />
      )
      break
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
