'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { useAuthToken, useSaveOnboardingMutation } from '@/lib/queries'

import { DEFAULTS, secondaryBtn } from '@/components/onboarding/shared'
import type { OnboardingData } from '@/components/onboarding/shared'
import { useIsMobile } from '@/components/onboarding/useIsMobile'
import { ProgressBar } from '@/components/onboarding/ProgressBar'
import { Step1Basics } from '@/components/onboarding/Step1Basics'
import { Step2Employment } from '@/components/onboarding/Step2Employment'
import { Step3Contract } from '@/components/onboarding/Step3Contract'
import { Step4Goals } from '@/components/onboarding/Step4Goals'
import { Step5Plaid, type LinkedAccount } from '@/components/onboarding/Step5Plaid'
import { Step6Reveal } from '@/components/onboarding/Step6Reveal'
import { DashboardPreview } from '@/components/onboarding/DashboardPreview'
import { WelcomeIntro } from '@/components/onboarding/WelcomeIntro'

type Phase = 'welcome' | 'steps' | 'preview' | 'reveal'

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
  const router = useRouter()
  const isMobile = useIsMobile()
  const authToken = useAuthToken()
  const saveOnboarding = useSaveOnboardingMutation()

  const [phase, setPhase] = useState<Phase>('welcome')
  const [step, setStep]   = useState<number>(0)
  const [data, setData]   = useState<OnboardingData>(DEFAULTS)

  const [linkedAccounts, setLinkedAccounts] = useState<LinkedAccount[]>([])
  const [skippedPlaid, setSkippedPlaid]     = useState(false)

  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set())
  const [justCompleted, setJustCompleted]   = useState<number | null>(null)
  const [busy, setBusy]                     = useState(false)
  const [error, setError]                   = useState<string | null>(null)

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
      // ignore — fall through to intro
    }
    setIntroChecked(true)
  }, [])

  // Resume — load any existing profile and jump to the first step that still
  // has missing data. If all core fields are filled we still land on Step 1
  // so the user can review their info before seeing the reveal.
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
        setCompletedSteps(new Set(Array.from({ length: resume }, (_, i) => i)))
      } catch {
        // ignore — start fresh
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

  const step1Complete = useMemo(
    () => typeof data.age === 'number' && data.age > 0 && data.annualIncome > 0,
    [data.age, data.annualIncome]
  )

  const advanceTo = useCallback((next: number) => {
    setJustCompleted(step)
    setCompletedSteps(prev => new Set(prev).add(step))
    window.setTimeout(() => setJustCompleted(null), 650)
    setStep(next)
  }, [step])

  const handleBack = useCallback(() => {
    if (step <= 0) return
    setError(null)
    setStep(step - 1)
  }, [step])

  // Advance handler for steps 0–3 (pure "Continue"). Step 4 uses the Plaid-
  // specific handlers; step 5 triggers the preview then reveal.
  const handleContinue = useCallback(async () => {
    if (step === 0 && !step1Complete) {
      setError('Fill in age and annual salary to continue.')
      return
    }
    setBusy(true)
    const ok = await persistStep(step)
    setBusy(false)
    if (!ok) return
    advanceTo(step + 1)
  }, [step, step1Complete, persistStep, advanceTo])

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
      const j = await saveOnboarding.mutateAsync(body)
      setSkippedPlaid(Boolean(j?.skippedAssetLink))
      return true
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Network error. Please try again.'
      setError(msg)
      return false
    } finally {
      setBusy(false)
    }
  }, [data, saveOnboarding])

  const showPreview = useCallback(() => {
    setPhase('preview')
  }, [])

  const handlePreviewContinue = useCallback(() => {
    router.push('/dashboard/accounts')
  }, [router])

  const handlePlaidAssetLinked = useCallback(async () => {
    setJustCompleted(4)
    setCompletedSteps(prev => new Set(prev).add(4))
    window.setTimeout(() => setJustCompleted(null), 650)
    const ok = await finalize({ skipped: false })
    if (ok) showPreview()
  }, [finalize, showPreview])

  const handleSkipPlaid = useCallback(async () => {
    setJustCompleted(4)
    setCompletedSteps(prev => new Set(prev).add(4))
    window.setTimeout(() => setJustCompleted(null), 650)
    setSkippedPlaid(true)
    const ok = await finalize({ skipped: true })
    if (ok) showPreview()
  }, [finalize, showPreview])

  // "Skip to account overview" — available on Steps 2, 3, 4, 5. Enabled only
  // once Step 1 required fields exist. Clicking it finalizes onboarding with
  // whatever data has been entered and redirects straight to the dashboard.
  const skipToOverview = useCallback(async () => {
    if (!step1Complete) return
    // Persist whatever the user has typed on the current step first.
    await persistStep(step)
    const ok = await finalize({ skipped: true })
    if (ok) router.push('/dashboard')
  }, [step, step1Complete, persistStep, finalize, router])

  const showSkipButton = step >= 1 && step <= 4

  const stepVariants = {
    hidden:  { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0 },
    exit:    { opacity: 0, y: -8 },
  }

  // ── Render ───────────────────────────────────────────────────────────────
  if (!introChecked) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-bg)' }} />
    )
  }

  if (phase === 'welcome') {
    return <WelcomeIntro onStart={() => setPhase('steps')} />
  }

  if (phase === 'preview') {
    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: 'var(--color-bg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 20px',
        }}
      >
        <DashboardPreview
          age={data.age}
          annualIncome={data.annualIncome}
          savingsRate={data.savingsRate}
          retirementAge={data.retirementAge}
          skippedPlaid={skippedPlaid}
          onContinue={handlePreviewContinue}
        />
      </div>
    )
  }

  if (phase === 'reveal') {
    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: 'var(--color-bg)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ paddingTop: '20px' }}>
          <ProgressBar
            currentStep={5}
            completedSteps={new Set([0, 1, 2, 3, 4, 5])}
            justCompleted={justCompleted}
            isMobile={isMobile}
          />
        </div>
        <div
          className="onboarding-step-padding"
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Step6Reveal data={data} />
        </div>
      </div>
    )
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--color-bg)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ paddingTop: '20px' }}>
        <ProgressBar
          currentStep={step}
          completedSteps={completedSteps}
          justCompleted={justCompleted}
          isMobile={isMobile}
        />
      </div>

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
          disabled={step <= 0 || busy}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '32px',
            height: '32px',
            background: 'transparent',
            border: 'none',
            padding: 0,
            cursor: step <= 0 || busy ? 'default' : 'pointer',
            opacity: step <= 0 ? 0 : 1,
            visibility: step <= 0 ? 'hidden' : 'visible',
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
        <div style={{ width: '32px' }} />
      </div>

      <div
        className="onboarding-step-padding"
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            variants={stepVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ duration: 0.25, ease: 'easeOut' }}
            style={{ width: '100%', maxWidth: step === 0 && !isMobile ? '860px' : '520px' }}
          >
            {step === 0 && (
              <Step1Basics
                data={data}
                onChange={handlePatch}
                isMobile={isMobile}
                onAdvance={handleContinue}
              />
            )}
            {step === 1 && <Step2Employment data={data} onChange={handlePatch} />}
            {step === 2 && (
              <Step3Contract
                data={data}
                onChange={handlePatch}
                onAdvance={handleContinue}
              />
            )}
            {step === 3 && <Step4Goals data={data} onChange={handlePatch} />}
            {step === 4 && (
              <Step5Plaid
                linkedAccounts={linkedAccounts}
                onLinked={accts => setLinkedAccounts(prev => [...prev, ...accts])}
                onCompleteAssetLinked={handlePlaidAssetLinked}
                onSkipForNow={handleSkipPlaid}
                busy={busy}
              />
            )}

            {error && (
              <p
                style={{
                  marginTop: '16px',
                  fontSize: '12px',
                  color: 'var(--color-negative)',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                {error}
              </p>
            )}

            {/* Desktop Step 1 + Steps 1 and 3 use their own advance. Step 2 (employment)
                and Step 4 (goals) need a shared Continue button. */}
            {(step === 1 || step === 3) && (
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '44px' }}>
                <button
                  type="button"
                  onClick={handleContinue}
                  disabled={busy}
                  style={{
                    padding: '13px 36px',
                    backgroundColor: 'var(--color-gold)',
                    border: 'none',
                    borderRadius: '2px',
                    color: 'var(--color-surface)',
                    fontSize: '12px',
                    fontFamily: 'var(--font-mono)',
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    fontWeight: 500,
                    cursor: busy ? 'not-allowed' : 'pointer',
                    opacity: busy ? 0.65 : 1,
                  }}
                >
                  {busy ? 'Saving…' : 'Continue'}
                </button>
              </div>
            )}

            {/* Desktop Step 1: explicit Continue button since Step1Basics only auto-advances on mobile */}
            {step === 0 && !isMobile && (
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '44px' }}>
                <button
                  type="button"
                  onClick={handleContinue}
                  disabled={busy || !step1Complete}
                  style={{
                    padding: '13px 36px',
                    backgroundColor: 'var(--color-gold)',
                    border: 'none',
                    borderRadius: '2px',
                    color: 'var(--color-surface)',
                    fontSize: '12px',
                    fontFamily: 'var(--font-mono)',
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    fontWeight: 500,
                    cursor: busy || !step1Complete ? 'not-allowed' : 'pointer',
                    opacity: busy || !step1Complete ? 0.55 : 1,
                  }}
                >
                  {busy ? 'Saving…' : 'Continue'}
                </button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Persistent "Skip to account overview" — steps 2, 3, 4, 5 */}
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
            onClick={skipToOverview}
            disabled={!step1Complete || busy}
            style={{
              ...secondaryBtn,
              opacity: !step1Complete || busy ? 0.45 : 1,
              cursor: !step1Complete || busy ? 'not-allowed' : 'pointer',
            }}
          >
            Skip to account overview
          </button>
        </div>
      )}
    </div>
  )
}

