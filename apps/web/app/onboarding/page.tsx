'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { useAuthToken, useSaveOnboardingMutation } from '@/lib/queries'

import {
  DEFAULTS,
  SUB_STEP_COUNTS,
  TOTAL_SUB_STEPS,
  globalSubIndex,
} from '@/components/onboarding/shared'
import type { OnboardingData } from '@/components/onboarding/shared'
import { useIsMobile } from '@/hooks/useIsMobile'
import { ProgressBar } from '@/components/onboarding/ProgressBar'
import { Step1Basics } from '@/components/onboarding/Step1Basics'
import { Step2Employment } from '@/components/onboarding/Step2Employment'
import { Step3Contract } from '@/components/onboarding/Step3Contract'
import { Step4Goals } from '@/components/onboarding/Step4Goals'
import { Step5Plaid, type LinkedAccount } from '@/components/onboarding/Step5Plaid'
import { LiveProjection } from '@/components/onboarding/LiveProjection'
import { WelcomeIntro } from '@/components/onboarding/WelcomeIntro'
import { OnboardingDevRestart } from '@/components/onboarding/OnboardingDevRestart'

type Phase = 'welcome' | 'steps'

// API error codes (from app/api/user/onboarding/route.ts) mapped to
// user-facing copy. Kept local to the render site so the API contract stays
// stable for other consumers.
const ERROR_COPY: Record<string, string> = {
  onboarding_save_failed: "We couldn't save your progress. Try again in a moment.",
  asset_account_required:
    'Link a checking, savings, or investment account to continue.',
}

function describeError(raw: string | null): string | null {
  if (!raw) return null
  if (ERROR_COPY[raw]) return ERROR_COPY[raw]
  // Heuristic: error codes are lowercase snake_case with no spaces. If the
  // string looks like one but has no mapping, fall back to a generic message
  // so a raw key never reaches the screen.
  if (/^[a-z][a-z0-9_]*$/.test(raw)) {
    return 'Something went wrong. Try again.'
  }
  return raw
}

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
  // useIsMobile returns null on SSR and the first client paint before
  // measurement. Treat null as mobile here: the mobile sticky LiveProjection
  // and mobile padding render fine on desktop, while desktop sidecar layout
  // breaks on mobile. After hydration, the value flips to true/false based
  // on the real viewport.
  const isMobile = useIsMobile()
  const authToken = useAuthToken()
  const saveOnboarding = useSaveOnboardingMutation()
  const router = useRouter()

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

  // Wait until we have fetched the profile (source of truth for intro seen)
  // before choosing between the cinematic intro and jumping straight to
  // Step 1. Prevents a flash of the intro for returning users.
  const [introChecked, setIntroChecked] = useState(false)

  // Resume logic preserved. Jumps to the first step that still has missing
  // data; sub-step always resets to 0 within that step. Also reads
  // introSeenAt from the profile and skips the welcome intro if set.
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

        if (profile.introSeenAt) setPhase('steps')

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
          riskTolerance:              profile.riskTolerance ?? prev.riskTolerance,
        }))

        // contractStepSkippedAt advances past Step 3 without implying an
        // upload was completed. The resume tier is identical to "uploaded"
        // for now; the timestamp is kept distinct so future nudges can
        // surface Step 3 again to users who deferred.
        const resume: number =
          profile.contractParsedData || profile.contractStepSkippedAt ? 3
          : profile.jobTitle || profile.employer ? 2
          : profile.age ? 1
          : 0
        setStep(resume)
        setSubIndex(0)
      } catch {
        // ignore, start fresh
      } finally {
        if (!cancelled) setIntroChecked(true)
      }
    })()
    return () => { cancelled = true }
  }, [authToken])

  // Called when the user advances past the welcome intro. Persists the
  // dismissal server-side so it applies across browsers and devices, and
  // flips the phase locally. The POST is fire-and-forget; a failure here
  // would only mean the intro might replay on another device, which is
  // preferable to blocking the user on a transient network error.
  const handleIntroDismissed = useCallback(() => {
    setPhase('steps')
    if (!authToken) return
    void fetch('/api/user/onboarding/intro-seen', {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` },
    }).catch(() => { /* ignore */ })
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
  // sub-index. Otherwise roll over to the next step and fire the save in
  // the background so the transition feels instant. A failed save still
  // surfaces via setError, and resume logic can recover partial state on
  // next login.
  const handleSubAdvance = useCallback(() => {
    const subCount = SUB_STEP_COUNTS[step] ?? 1
    if (subIndex + 1 < subCount) {
      setSubIndex(subIndex + 1)
      return
    }
    setStep(step + 1)
    setSubIndex(0)
    void persistStep(step)
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

  const goToDashboard = useCallback(() => {
    router.push('/dashboard')
  }, [router])

  const handlePlaidAssetLinked = useCallback(async () => {
    const ok = await finalize({ skipped: false })
    if (ok) goToDashboard()
  }, [finalize, goToDashboard])

  const handleSkipPlaid = useCallback(async () => {
    const ok = await finalize({ skipped: true })
    if (ok) goToDashboard()
  }, [finalize, goToDashboard])

  // Skip-the-current-step: persists whatever partial data exists for the
  // current step and advances one step forward. On the final interactive
  // step (Plaid), skipping finalizes and routes straight to the dashboard,
  // matching the in-Plaid "Connect later" affordance.
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
      if (ok) goToDashboard()
      return
    }
    setStep(step + 1)
    setSubIndex(0)
  }, [step, persistStep, finalize, goToDashboard])

  // Progress value for the hairline bar. Maps (step, subIndex) to a
  // fraction of the total sub-step count.
  const progressValue = useMemo(() => {
    if (step >= SUB_STEP_COUNTS.length) return 1
    const idx = globalSubIndex(step, subIndex)
    return Math.max(0, Math.min(1, idx / TOTAL_SUB_STEPS))
  }, [step, subIndex])

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
        <WelcomeIntro onStart={handleIntroDismissed} />
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
          position: 'relative',
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
            flow. Suppressed on Step 5 because that step renders its own
            bespoke gap-reveal and the sidecar would duplicate the projection. */}
        {isMobile !== false && salaryEverEntered && step !== 4 && (
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

        {/* Main content area. The flex:1 wrapper centers the question
            vertically between the Illumin wordmark and the bottom of the
            viewport. */}
        <div
          className="onboarding-step-padding"
          style={{
            flex: 1,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            paddingTop: 0,
            paddingBottom: isMobile !== false ? '32px' : '48px',
            minHeight: 0,
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '1040px',
              display: 'grid',
              gridTemplateColumns:
                isMobile !== false || !salaryEverEntered || step === 4
                  ? '1fr'
                  : 'minmax(0, 1fr) minmax(300px, max-content)',
              gap: isMobile !== false ? '24px' : '56px',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                display: 'flex',
                // Age and Location render centered on the page; Step 5
                // (Plaid) also centers because the sidecar is suppressed and
                // the reveal card should sit on the column axis. Every other
                // question falls back to left-aligned so it lines up with the
                // LiveProjection sidecar slot.
                justifyContent:
                  (step === 0 && subIndex < 2) || step === 4
                    ? 'center'
                    : 'flex-start',
                minWidth: 0,
              }}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${step}-${subIndex}`}
                  variants={stepVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                  // The motion wrapper is full-width so its flex parent's
                  // justify-content is a no-op. When the sub-step should be
                  // centered, make this wrapper a flex column that centers
                  // its single child (the 620px form) on the x-axis.
                  // Otherwise let the child stretch to fill the available
                  // left-aligned column.
                  style={{
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems:
                      (step === 0 && subIndex < 2) || step === 4
                        ? 'center'
                        : 'stretch',
                  }}
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
                      onSkip={skipCurrentStep}
                      busy={busy}
                      isMobile={isMobile}
                    />
                  )}
                  {step === 2 && (
                    <Step3Contract
                      data={data}
                      onChange={handlePatch}
                      onAdvance={handleSubAdvance}
                      onSkip={skipCurrentStep}
                      busy={busy}
                      isMobile={isMobile}
                    />
                  )}
                  {step === 3 && (
                    <Step4Goals
                      data={data}
                      onChange={handlePatch}
                      subIndex={subIndex}
                      onSubAdvance={handleSubAdvance}
                      onSkip={skipCurrentStep}
                      busy={busy}
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
                      targetRetirementIncome={data.targetRetirementIncome}
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
                      {describeError(error)}
                    </p>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {isMobile === false && salaryEverEntered && step !== 4 && (
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

      </div>
      <OnboardingDevRestart />
    </>
  )
}
