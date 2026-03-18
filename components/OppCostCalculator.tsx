'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import styles from '@/app/landing.module.css'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseAmt(s: string): number {
  return parseFloat(s.replace(/[^0-9.]/g, '')) || 0
}

function fmtFull(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', maximumFractionDigits: 0,
  }).format(n)
}

function fmtCompact(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `$${Math.round(n / 1_000)}K`
  return fmtFull(n)
}

interface Result {
  years: number
  savingsRatePct: number
  monthlyInvest: number
  optimalMonthly: number
  projectedCurrent: number
  projectedOptimal: number
  gap: number
  costDelay: number
}

function fv(pmt: number, n: number): number {
  if (pmt <= 0 || n <= 0) return 0
  const r = 0.07 / 12
  return pmt * (Math.pow(1 + r, n) - 1) / r
}

function compute(age: number, annualIncome: number, savingsRate: number): Result {
  const years         = Math.max(5, 65 - age)
  const months        = years * 12
  const monthlyInvest = (annualIncome * savingsRate / 100) / 12
  const optimalMonthly   = (annualIncome * 0.20) / 12
  const projectedCurrent = Math.round(fv(monthlyInvest, months))
  const projectedOptimal = Math.round(fv(optimalMonthly, months))
  const gap              = Math.max(0, projectedOptimal - projectedCurrent)
  const costDelay        = Math.max(0, Math.round(
    fv(monthlyInvest, months) - fv(monthlyInvest, Math.max(0, months - 12))
  ))

  return { years, savingsRatePct: savingsRate, monthlyInvest, optimalMonthly, projectedCurrent, projectedOptimal, gap, costDelay }
}

function useCountUp(target: number, active: boolean): number {
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (!active || target === 0) { setVal(0); return }
    const duration  = 1800
    const startTime = Date.now()
    let rafId: number
    const tick = () => {
      const elapsed  = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased    = 1 - Math.pow(1 - progress, 4)
      setVal(Math.round(eased * target))
      if (progress < 1) { rafId = requestAnimationFrame(tick) }
    }
    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [target, active])
  return val
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function OppCostCalculator() {
  const [step,           setStep]           = useState(0)
  const [age,            setAge]            = useState('')
  const [income,         setIncome]         = useState('')
  const [savingsRate,    setSavingsRate]     = useState(5)
  const [ageErr,         setAgeErr]         = useState('')
  const [incomeErr,      setIncomeErr]      = useState('')
  const [email,          setEmail]          = useState('')
  const [emailErr,       setEmailErr]       = useState('')
  const [emailSubmitted, setEmailSubmitted] = useState(false)
  const inputRef    = useRef<HTMLInputElement>(null)
  const mirrorRef   = useRef<HTMLSpanElement>(null)
  const [ageMirrorW, setAgeMirrorW] = useState(0)
  const stepRef  = useRef(step)
  useEffect(() => { stepRef.current = step }, [step])

  useEffect(() => {
    if (step === 3) {
      window.history.pushState({ illuminCalcResult: true }, '')
    }
  }, [step])

  useEffect(() => {
    const handlePop = () => {
      if (stepRef.current === 3) {
        setStep(0)
        setAge('')
        setIncome('')
        setSavingsRate(5)
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
    }
    window.addEventListener('popstate', handlePop)
    return () => window.removeEventListener('popstate', handlePop)
  }, [])

  useEffect(() => {
    if (step < 2) {
      const t = setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 400)
      return () => clearTimeout(t)
    }
  }, [step])

  const result      = step === 3 ? compute(parseInt(age), parseAmt(income), savingsRate) : null
  const countedNum  = useCountUp(result?.costDelay ?? 0, step === 3)

  const advance = () => {
    if (step === 0) {
      const a = parseInt(age)
      if (!age || isNaN(a) || a < 18 || a > 70) {
        setAgeErr('Please enter an age between 18 and 70.')
        return
      }
    }
    if (step === 1) {
      if (parseAmt(income) <= 0) {
        setIncomeErr('Please enter your annual income.')
        return
      }
    }
    setStep(s => s + 1)
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') advance()
  }

  const handleIncomeChange = (raw: string) => {
    const digits = raw.replace(/[^0-9]/g, '')
    const n = parseInt(digits)
    setIncome(isNaN(n) ? '' : n.toLocaleString('en-US'))
    setIncomeErr('')
  }

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailErr('Please enter a valid email address.')
      return
    }
    setEmailErr('')
    try {
      await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
    } finally {
      setEmailSubmitted(true)
    }
  }

  // Slider fill percentage
  const savingsPct = (savingsRate / 50) * 100
  const monthlyLive = income ? (parseAmt(income) * savingsRate / 100) / 12 : 0

  return (
    <section className={styles.calcSection}>
      <div className={styles.calcInner}>

        <div className={styles.calcSectionHeader}>
          <p className={styles.sectionEyebrow}>The calculation</p>
          <h2 className={styles.sectionHeadline}>See your number.</h2>
          <p className={styles.sectionSub}>
            Three inputs. The exact dollar cost of your current trajectory, and what closing the gap looks like.
          </p>
        </div>

        <AnimatePresence mode="wait">

          {/* ── Steps 0–2: inputs ─────────────────────────────────── */}
          {step < 3 && (
            <motion.div
              key={`step-${step}`}
              className={styles.calcStepWrap}
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.38, ease: 'easeOut' }}
            >
              {/* Locked previous answers */}
              {step > 0 && (
                <motion.div
                  className={styles.calcProgress}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <span className={styles.calcProgressItem}>Age: {age}</span>
                  {step > 1 && (
                    <span className={styles.calcProgressItem}>Income: ${income} / yr</span>
                  )}
                </motion.div>
              )}

              <p className={styles.calcEyebrow}>Step {step + 1} of 3</p>

              {/* Step 0: Age */}
              {step === 0 && (
                <>
                  <h3 className={styles.calcQuestion}>How old are you?</h3>
                  <div className={styles.calcInputWrap}>
                    {/* Hidden mirror to measure typed text width */}
                    <span
                      ref={mirrorRef}
                      aria-hidden
                      className={styles.calcInputMirror}
                    >
                      {age}
                    </span>
                    <input
                      ref={inputRef}
                      type="text"
                      inputMode="numeric"
                      className={`${styles.calcInput} ${styles.calcInputPrefixed}`}
                      value={age}
                      onChange={e => {
                        const v = e.target.value.replace(/[^0-9]/g, '')
                        setAge(v)
                        setAgeErr('')
                        requestAnimationFrame(() => {
                          setAgeMirrorW(mirrorRef.current?.offsetWidth ?? 0)
                        })
                      }}
                      onKeyDown={handleKey}
                      placeholder="enter your age"
                    />
                    {age && (
                      <span
                        className={styles.calcInputSuffix}
                        style={{ left: `calc(50% + ${ageMirrorW / 2}px - 2px)`, right: 'auto' }}
                      >
                        years old
                      </span>
                    )}
                  </div>
                  {ageErr && <p className={styles.calcErr}>{ageErr}</p>}
                  <p className={styles.calcHint}>We&apos;ll assume retirement at 65.</p>
                </>
              )}

              {/* Step 1: Income */}
              {step === 1 && (
                <>
                  <h3 className={styles.calcQuestion}>What&apos;s your annual income?</h3>
                  <div className={styles.calcInputWrap}>
                    <span className={styles.calcInputPrefix}>$</span>
                    <input
                      ref={inputRef}
                      type="text"
                      inputMode="numeric"
                      className={`${styles.calcInput} ${styles.calcInputPrefixed}`}
                      value={income}
                      onChange={e => handleIncomeChange(e.target.value)}
                      onKeyDown={handleKey}
                      placeholder="enter your income"
                    />
                  </div>
                  {incomeErr && <p className={styles.calcErr}>{incomeErr}</p>}
                  <p className={styles.calcHint}>Pre-tax. Used to calculate your target investment rate.</p>
                </>
              )}

              {/* Step 2: Savings rate slider */}
              {step === 2 && (
                <>
                  <h3 className={styles.calcQuestion}>What share of your income are you investing?</h3>

                  <div className={styles.calcSliderRow}>
                    <input
                      type="range"
                      min={0}
                      max={50}
                      value={savingsRate}
                      onChange={e => setSavingsRate(Number(e.target.value))}
                      className={styles.calcSlider}
                      style={{
                        background: `linear-gradient(to right, white ${savingsPct}%, rgba(255,255,255,0.12) ${savingsPct}%)`,
                      }}
                    />
                    <div className={styles.calcSliderReadoutWrap}>
                      <span className={styles.calcSliderReadoutLabel}>That&apos;s</span>
                      <span className={styles.calcSliderReadout}>{savingsRate}%</span>
                    </div>
                  </div>

                  {/* Live dollar readout */}
                  <div className={styles.calcSliderBox}>
                    <div className={styles.calcSliderBoxInner}>
                      <span className={styles.calcSliderBoxValue}>
                        {fmtFull(monthlyLive)}
                        <span className={styles.calcSliderBoxUnit}> / month</span>
                      </span>
                    </div>
                    <p className={styles.calcSliderBoxNote}>
                      Total flowing into 401(k), IRA, and brokerage after every expense is covered.
                    </p>
                  </div>

                  <div className={styles.calcSliderBenchmarks}>
                    <span className={styles.calcSliderBenchmark}>National median: 5%</span>
                    <span className={styles.calcSliderBenchmark}>Recommended: 15-20%</span>
                  </div>
                </>
              )}

              <div className={styles.calcActions}>
                {step > 0 && (
                  <button className={styles.btnGhost} onClick={() => setStep(s => s - 1)}>
                    Back
                  </button>
                )}
                <button className={styles.btnPrimary} onClick={advance}>
                  {step < 2 ? 'Continue' : 'Calculate'}
                </button>
              </div>
            </motion.div>
          )}

          {/* ── Step 3: result ────────────────────────────────────── */}
          {step === 3 && result && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            >
              <div className={styles.revealInner}>

                {/* Left: big number + badge */}
                <div>
                  <p className={styles.sectionEyebrow}>Cost of waiting one year</p>

                  <div className={styles.revealNumber}>
                    {fmtFull(countedNum)}
                  </div>

                  <div className={styles.calcBadge}>
                    Every. Single. Year.
                  </div>

                  <p className={styles.revealDesc}>
                    This is not a one-time loss. Every year you delay optimizing, you forfeit this amount in retirement wealth, permanently.
                  </p>

                  <p className={styles.revealDesc} style={{ marginTop: '12px' }}>
                    Wait 5 years and the true cost is{' '}
                    <strong style={{ color: 'var(--lm-text)' }}>{fmtFull(result.costDelay * 5)}</strong>.
                    Wait 10 years:{' '}
                    <strong style={{ color: 'var(--lm-text)' }}>{fmtFull(result.costDelay * 10)}</strong>.
                  </p>

                  <p className={styles.revealNote}>
                    Based on 7% annualized real return.<br />
                    S&amp;P 500 historical average. Calculated in today&apos;s dollars.
                  </p>

                  <button
                    className={styles.calcRecalc}
                    onClick={() => { setStep(0); setAge(''); setIncome(''); setSavingsRate(5) }}
                  >
                    Recalculate
                  </button>
                </div>

                {/* Right: breakdown card + email */}
                <div>
                  <div className={styles.revealCard}>
                    <div className={styles.revealCardRow}>
                      <span className={styles.revealCardLabel}>Years to retirement</span>
                      <span className={styles.revealCardVal}>{result.years}</span>
                    </div>
                    <div className={styles.revealCardRow}>
                      <span className={styles.revealCardLabel}>Current monthly investment</span>
                      <span className={styles.revealCardVal}>{fmtFull(result.monthlyInvest)}</span>
                    </div>
                    <div className={styles.revealCardRow}>
                      <span className={styles.revealCardLabel}>Current savings rate</span>
                      <span className={styles.revealCardVal}>{result.savingsRatePct}%</span>
                    </div>
                    <div className={styles.revealCardRow}>
                      <span className={styles.revealCardLabel}>Projected at current rate</span>
                      <span className={styles.revealCardVal}>{fmtCompact(result.projectedCurrent)}</span>
                    </div>
                    <div className={styles.revealCardRow}>
                      <span className={styles.revealCardLabel}>Projected at 20% rate</span>
                      <span className={`${styles.revealCardVal} ${styles.positive}`}>
                        {fmtCompact(result.projectedOptimal)}
                      </span>
                    </div>
                  </div>

                  {/* Email capture */}
                  <div className={styles.calcEmailWrap}>
                    {emailSubmitted ? (
                      <p className={styles.calcEmailConfirm}>
                        You&apos;re on the list. We&apos;ll be in touch.
                      </p>
                    ) : (
                      <>
                        <p className={styles.calcEmailHeadline}>
                          Don&apos;t let this be just a number.
                        </p>
                        <p className={styles.calcEmailSub}>
                          Get early access to Illumin and a full action plan at launch.
                        </p>
                        <form onSubmit={handleEmailSubmit} className={styles.calcEmailForm} noValidate>
                          <input
                            type="email"
                            className={styles.ctaInput}
                            placeholder="Your email address"
                            value={email}
                            onChange={e => { setEmail(e.target.value); setEmailErr('') }}
                            autoComplete="email"
                          />
                          <button type="submit" className={styles.btnPrimary}>
                            Claim your spot
                          </button>
                        </form>
                        {emailErr && <p className={styles.ctaError}>{emailErr}</p>}
                      </>
                    )}
                  </div>
                </div>

              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </section>
  )
}
