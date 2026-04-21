'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useAuthToken, useSaveOnboardingMutation } from '@/lib/queries'

import {
  DEFAULTS,
  SUB_STEP_COUNTS,
  TOTAL_SUB_STEPS,
  globalSubIndex,
  secondaryBtn,
} from '@/components/onboarding/shared'
import type { OnboardingData } from '@/components/onboarding/shared'
import { useIsMobile } from '@/hooks/useIsMobile'
import { ProgressBar } from '@/components/onboarding/ProgressBar'
import { Step1Basics } from '@/components/onboarding/Step1Basics'
import { Step2Employment } from '@/components/onboarding/Step2Employment'
import { Step3Contract } from '@/components/onboarding/Step3Contract'
import { Step4Goals } from '@/components/onboarding/Step4Goals'
import { Step5Plaid, type LinkedAccount } from '@/components/onboarding/Step5Plaid'
import { Step6Reveal } from '@/components/onboarding/Step6Reveal'
import { LiveProjection } from '@/components/onboarding/LiveProjection'
import { WelcomeIntro } from '@/components/onboarding/WelcomeIntro'
import { OnboardingDevRestart } from '@/components/onboarding/OnboardingDevRestart'

type Phase = 'welcome' | 'steps' | 'reveal'

// Step-index to field-payload mapping. Each step only sends its own fields so
// a partial save does not clobber later steps on refresh/resume.
function payloadForStep(step: number, data: OnboardingData): Record<string, unknown> {
  if (step === 0) {
    return {
      age: data.age === '' ? null : data.age,
      annualIncome: data.annualIncome,
      savingsRate: data.savingsRate,
      retirementAge: data.retirementAge,
      locationCity: data.locationCity,
      locationState: data.locationState,
    }
  }
  if (step === 1) {
    return {
      jobTitle: data.jobTitle,
      employer: data.employer,
      employerStartDate: data.employerStartDate || null,
    }
  }
  if (step === 2) {
    return {
      contractParsedData: data.contractParsedData,
    }
  }
  if (step === 3) {
    return {
      targetRetirementIncome: data.targetRetirementIncome,
      emergencyFundMonthsTarget: data.emergencyFundMonthsTarget,
      riskTolerance: data.riskTolerance,
    }
  }
  return {}
}

export default function OnboardingPage() {
  const isMobile = useIsMobile()
  const authToken = useAuthToken()
  const saveOnboarding = useSaveOnboardingMutation()

  const [phase, setPhase] = useState<Phase>('welcome')
  const [step, setStep]   = useState<number>(0)
  const [subIndex, setSubIndex] = useState<number>(0)
  const [data, setData]   = useState<OnboardingData>(DEFAULTS)

  const [linkedAccounts, setLinkedAccounts] = useState<LinkedAccount[]>([])

  const [busy, setBusy]                     = useState(false)
  const [error, setError]                   = useState<string | null>(null)

  // Once the user has ever typed a salary in this session, the LiveProjection
  // card is eligible to render. Before that, the sidecar column and the
  // mobile sticky wrapper are both skipped so the step content doesn't sit
  // beside an empty slot. Conditional setState during render is the
  // canonical pattern for mirroring props.
  const [salaryEverEntered, setSalaryEverEntered] = useState<boolean>(data.annualIncome > 0)
  if (data.annualIncome > 0 && !salaryEverEntered) setSalaryEverEntered(true)

  // Wait until we have checked localStorage before choosing between the
  // cinematic intro and jumping straight to Step 1. Prevents a flash of the
  // intro for returning users.
  const [introChecked, setIntroChecked] = useState(false)
  useEffect(() => {
    try {
      if (window.localStorage.getItem('illumin_onboarding_intro_seen') === 'true') {
        setPhase('steps')
      }
    } catch {
      // ignore, fall through to intro
    }
    setIntroChecked(true)
  }, [])

  // Resume logic preserved. Jumps to the first step that still has missing
  // data; sub-step always resets to 0 within that step.
  useEffect(() => {
    if (!authToken) return
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/user/onboarding', {
          headers: { Authorization: `Bearer ${authToken}` },
        })
        if (!res.ok) return
        const { profile } = await res.json()
        if (cancelled || !profile) return

        setData(prev => ({
          ...prev,
          age:                        typeof profile.age === 'number' ? profile.age : '',
          annualIncome:               profile.annualIncome ?? 0,
          savingsRate:                profile.savingsRate ?? prev.savingsRate,
          retirementAge:              profile.retirementAge ?? prev.retirementAge,
          locationCity:               profile.locationCity ?? '',
          locationState:              profile.locationState ?? '',
          jobTitle:                   profile.jobTitle ?? '',
          employer:                   profile.employer ?? '',
          employerStartDate:          profile.employerStartDate
            ? String(profile.employerStartDate).slice(0, 10)
            : '',
          contractParsedData:         profile.contractParsedData ?? null,
          contractUploadedAt:         profile.contractUploadedAt ?? null,
          targetRetirementIncome:     profile.targetRetirementIncome ?? null,
          emergencyFundMonthsTarget:  profile.emergencyFundMonthsTarget ?? prev.emergencyFundMonthsTarget,
          majorGoals:                 Array.isArray(profile.majorGoals) ? profile.majorGoals : [],
          riskTolerance:              profile.riskTolerance ?? prev.riskTolerance,
        }))

        const resume: number =
          profile.contractParsedData ? 3
          : profile.jobTitle || profile.employer ? 2
          : profile.age ? 1
          : 0
        setStep(resume)
        setSubIndex(0)
      } catch {
        // ignore, start fresh
      }
    })()
    return () => { cancelled = true }
  }, [authToken])

  const handlePatch = useCallback((patch: Partial<OnboardingData>) => {
    setData(prev => ({ ...prev, ...patch }))
  }, [])

  const persistStep = useCallback(async (stepIdx: number, extra: Record<string, unknown> = {}) => {
    setError(null)
    try {
      const body = { step: stepIdx, ...payloadForStep(stepIdx, data), ...extra }
      await saveOnboarding.mutateAsync(body)
      return true
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not save progress.'
      setError(msg)
      return false
    }
  }, [data, saveOnboarding])

  const handleBack = useCallback(() => {
    setError(null)
    if (subIndex > 0) {
      setSubIndex(subIndex - 1)
      return
    }
    if (step > 0) {
      const prevStep = step - 1
      const prevSubCount = SUB_STEP_COUNTS[prevStep] ?? 1
      setStep(prevStep)
      setSubIndex(Math.max(0, prevSubCount - 1))
    }
  }, [step, subIndex])

  // Internal sub-advance. If more sub-steps remain in this step, bump the
  // sub-index. Otherwise persist the step and roll over to the next step.
  const handleSubAdvance = useCallback(async () => {
    const subCount = SUB_STEP_COUNTS[step] ?? 1
    if (subIndex + 1 < subCount) {
      setSubIndex(subIndex + 1)
      return
    }
    setBusy(true)
    const ok = await persistStep(step)
    setBusy(false)
    if (!ok) return
    setStep(step + 1)
    setSubIndex(0)
  }, [step, subIndex, persistStep])

  const finalize = useCallback(async (opts: { skipped: boolean }): Promise<boolean> => {
    setBusy(true)
    setError(null)
    try {
      const body = {
        finalize: true,
        skipped:  opts.skipped,
        age:              data.age === '' ? null : data.age,
        annualIncome:     data.annualIncome,
        savingsRate:      data.savingsRate,
        retirementAge:    data.retirementAge,
      }
      await saveOnboarding.mutateAsync(body)
      return true
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Network error. Please try again.'
      setError(msg)
      return false
    } finally {
      setBusy(false)
    }
  }, [data, saveOnboarding])

  const showReveal = useCallback(() => {
    setPhase('reveal')
  }, [])

  const handlePlaidAssetLinked = useCallback(async () => {
    const ok = await finalize({ skipped: false })
    if (ok) showReveal()
  }, [finalize, showReveal])

  const handleSkipPlaid = useCallback(async () => {
    const ok = await finalize({ skipped: true })
    if (ok) showReveal()
  }, [finalize, showReveal])

  // Skip-the-current-step: persists whatever partial data exists for the
  // current step and advances one step forward. On the final interactive
  // step (Plaid), skipping rolls into the reveal phase, matching the
  // in-Plaid "Connect later" affordance.
  const skipCurrentStep = useCallback(async () => {
    setError(null)
    setBusy(true)
    try {
      await persistStep(step, { skipped: true })
    } finally {
      setBusy(false)
    }
    if (step >= SUB_STEP_COUNTS.length - 1) {
      const ok = await finalize({ skipped: true })
      if (ok) showReveal()
      return
    }
    setStep(step + 1)
    setSubIndex(0)
  }, [step, persistStep, finalize, showReveal])

  // Skip for now surfaces on every step after the final Step 1 sub-question
  // ("When do you want to retire?"). Once the user has entered their basics
  // we can run the rest of the app on those values alone, so every
  // subsequent step gets a low-friction bail-out that advances one step
  // rather than abandoning the rest of onboarding wholesale.
  const showSkipButton = step >= 1 && step <= 4

  // Progress value for the hairline bar. The reveal phase renders a
  // fully-filled bar; the steps phase maps (step, subIndex) to a fraction
  // of the total sub-step count.
  const progressValue = useMemo(() => {
    if (phase === 'reveal') return 1
    if (step >= SUB_STEP_COUNTS.length) return 1
    const idx = globalSubIndex(step, subIndex)
    return Math.max(0, Math.min(1, idx / TOTAL_SUB_STEPS))
  }, [phase, step, subIndex])

  const stepVariants = {
    hidden:  { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0 },
    exit:    { opacity: 0, y: -8 },
  }

  // ── Render ───────────────────────────────────────────────────────────────
  if (!introChecked) {
    return (
      <>
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-bg)' }} />
        <OnboardingDevRestart />
      </>
    )
  }

  if (phase === 'welcome') {
    return (
      <>
        <WelcomeIntro onStart={() => setPhase('steps')} />
        <OnboardingDevRestart />
      </>
    )
  }

  if (phase === 'reveal') {
    return (
      <>
        <div
          style={{
            minHeight: '100dvh',
            backgroundColor: 'var(--color-bg)',
            overflowX: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ paddingTop: '20px', position: 'sticky', top: 0, zIndex: 30, backgroundColor: 'var(--color-bg)' }}>
            <ProgressBar value={1} isMobile={isMobile} />
          </div>
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
            }}
          >
            <Step6Reveal data={data} />
          </div>
        </div>
        <OnboardingDevRestart />
      </>
    )
  }

  return (
    <>
      <div
        style={{
          minHeight: '100dvh',
          backgroundColor: 'var(--color-bg)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Hairline progress bar at the very top. */}
        <div style={{ paddingTop: '20px' }}>
          <ProgressBar value={progressValue} isMobile={isMobile} />
        </div>

        {/* Top bar: back arrow (left) and wordmark (center). */}
        <div
          className="onboarding-top-bar"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexShrink: 0,
          }}
        >
          <button
            type="button"
            onClick={handleBack}
            aria-label="Back"
            disabled={(step === 0 && subIndex === 0) || busy}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: '44px',
              minHeight: '44px',
              background: 'transparent',
              border: 'none',
              padding: 0,
              cursor: (step === 0 && subIndex === 0) || busy ? 'default' : 'pointer',
              opacity: (step === 0 && subIndex === 0) ? 0 : 1,
              visibility: (step === 0 && subIndex === 0) ? 'hidden' : 'visible',
              color: 'var(--color-text-muted)',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
          </button>
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '16px',
              fontWeight: 400,
              color: 'var(--color-gold)',
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
            }}
          >
            Illumin
          </div>
          <div style={{ width: '44px' }} />
        </div>

        {/* Mobile sticky LiveProjection bar. Stays above the step content.
            Only renders once the user has entered a salary, so the strip
            doesn't sit empty across the entire pre-salary portion of the
            flow. */}
        {isMobile && salaryEverEntered && (
          <div
            style={{
              position: 'sticky',
              top: 0,
              zIndex: 20,
              padding: '12px 20px 14px',
              backgroundColor: 'var(--color-bg)',
              borderBottom: '1px solid var(--color-border)',
            }}
          >
            <LiveProjection
              data={data}
              step={step}
              linkedAccounts={linkedAccounts}
              variant="sticky-mobile"
            />
          </div>
        )}

        {/* Main content area: question + field (left / main) and LiveProjection
            sidecar (right on desktop). The flex:1 wrapper centers the
            content vertically within the remaining viewport space (after the
            progress bar, top bar, and optional mobile sticky LiveProjection
            are accounted for by normal flow). */}
        <div
          className="onboarding-step-padding"
          style={{
            flex: 1,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            paddingTop: 'clamp(24px, 4vh, 48px)',
            paddingBottom: 'clamp(24px, 4vh, 48px)',
            minHeight: 0,
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '1040px',
              display: 'grid',
              gridTemplateColumns:
                isMobile || !salaryEverEntered
                  ? '1fr'
                  : 'minmax(0, 1fr) minmax(300px, max-content)',
              gap: isMobile ? '24px' : '56px',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'flex-start', minWidth: 0 }}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${step}-${subIndex}`}
                  variants={stepVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                  style={{ width: '100%' }}
                >
                  {step === 0 && (
                    <Step1Basics
                      data={data}
                      onChange={handlePatch}
                      subIndex={subIndex}
                      onSubAdvance={handleSubAdvance}
                      isMobile={isMobile}
                    />
                  )}
                  {step === 1 && (
                    <Step2Employment
                      data={data}
                      onChange={handlePatch}
                      subIndex={subIndex}
                      onSubAdvance={handleSubAdvance}
                      isMobile={isMobile}
                    />
                  )}
                  {step === 2 && (
                    <Step3Contract
                      data={data}
                      onChange={handlePatch}
                      onAdvance={handleSubAdvance}
                      isMobile={isMobile}
                    />
                  )}
                  {step === 3 && (
                    <Step4Goals
                      data={data}
                      onChange={handlePatch}
                      subIndex={subIndex}
                      onSubAdvance={handleSubAdvance}
                      isMobile={isMobile}
                    />
                  )}
                  {step === 4 && (
                    <Step5Plaid
                      linkedAccounts={linkedAccounts}
                      onLinked={accts => setLinkedAccounts(prev => [...prev, ...accts])}
                      onCompleteAssetLinked={handlePlaidAssetLinked}
                      onSkipForNow={handleSkipPlaid}
                      busy={busy}
                      age={data.age}
                      annualIncome={data.annualIncome}
                      savingsRate={data.savingsRate}
                      retirementAge={data.retirementAge}
                      isMobile={isMobile}
                    />
                  )}

                  {error && (
                    <p
                      style={{
                        marginTop: '16px',
                        fontFamily: 'var(--font-sans)',
                        fontSize: '13px',
                        color: 'var(--color-negative)',
                      }}
                    >
                      {error}
                    </p>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {!isMobile && salaryEverEntered && (
              <div style={{ alignSelf: 'center', justifySelf: 'start' }}>
                <LiveProjection
                  data={data}
                  step={step}
                  linkedAccounts={linkedAccounts}
                  variant="sidecar"
                />
              </div>
            )}
          </div>
        </div>

        {/* Skip affordance on every step that supports it. Muted text button
            below the main content. No guilt language. Advances one step
            rather than abandoning the rest of onboarding. */}
        {showSkipButton && (
          <div
            style={{
              padding: isMobile ? '16px 20px 24px' : '16px 40px 24px',
              display: 'flex',
              justifyContent: 'flex-start',
            }}
          >
            <button
              type="button"
              onClick={skipCurrentStep}
              disabled={busy}
              style={{
                ...secondaryBtn,
                opacity: busy ? 0.45 : 1,
                cursor: busy ? 'not-allowed' : 'pointer',
              }}
            >
              Skip for now
            </button>
          </div>
        )}
      </div>
      <OnboardingDevRestart />
    </>
  )
}
