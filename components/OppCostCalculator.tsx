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
  currentMonthly: number
  optimalMonthly: number
  projectedCurrent: number
  projectedOptimal: number
  gap: number
  costDelay: number
}

function compute(age: number, annualIncome: number, currentMonthly: number): Result {
  const years   = Math.max(5, 65 - age)
  const months  = years * 12
  const r       = 0.07 / 12

  const fv = (pmt: number, n: number) =>
    pmt > 0 ? pmt * (Math.pow(1 + r, n) - 1) / r : 0

  const optimalMonthly   = (annualIncome * 0.20) / 12
  const projectedCurrent = Math.round(fv(currentMonthly, months))
  const projectedOptimal = Math.round(fv(optimalMonthly, months))
  const gap              = Math.max(0, projectedOptimal - projectedCurrent)
  const costDelay        = Math.max(0, Math.round(
    fv(currentMonthly, months) - fv(currentMonthly, Math.max(0, months - 12))
  ))
  const savingsRatePct = annualIncome > 0
    ? (currentMonthly * 12 / annualIncome) * 100
    : 0

  return { years, savingsRatePct, currentMonthly, optimalMonthly, projectedCurrent, projectedOptimal, gap, costDelay }
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
  const [monthly,        setMonthly]        = useState('')
  const [ageErr,         setAgeErr]         = useState('')
  const [incomeErr,      setIncomeErr]      = useState('')
  const [monthlyErr,     setMonthlyErr]     = useState('')
  const [email,          setEmail]          = useState('')
  const [emailErr,       setEmailErr]       = useState('')
  const [emailSubmitted, setEmailSubmitted] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const stepRef  = useRef(step)
  useEffect(() => { stepRef.current = step }, [step])

  // Push a history entry when result is shown so the browser back button works
  useEffect(() => {
    if (step === 3) {
      window.history.pushState({ lumenCalcResult: true }, '')
    }
  }, [step])

  // On popstate (back button), reset the calculator and scroll to top
  useEffect(() => {
    const handlePop = () => {
      if (stepRef.current === 3) {
        setStep(0)
        setAge('')
        setIncome('')
        setMonthly('')
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
    }
    window.addEventListener('popstate', handlePop)
    return () => window.removeEventListener('popstate', handlePop)
  }, [])

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 400)
    return () => clearTimeout(t)
  }, [step])

  const result     = step === 3 ? compute(parseInt(age), parseAmt(income), parseAmt(monthly)) : null
  const countedGap = useCountUp(result?.gap ?? result?.projectedCurrent ?? 0, step === 3)

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
    if (step === 2) {
      if (monthly === '') {
        setMonthlyErr('Please enter an amount (0 if you currently invest nothing).')
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

  const handleMonthlyChange = (raw: string) => {
    const digits = raw.replace(/[^0-9]/g, '')
    const n = parseInt(digits)
    setMonthly(isNaN(n) ? '' : n.toLocaleString('en-US'))
    setMonthlyErr('')
  }

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailErr('Please enter a valid email address.')
      return
    }
    setEmailErr('')
    setEmailSubmitted(true)
  }

  const primaryHeadlineNum = result
    ? (result.gap > 0 ? countedGap : result.projectedCurrent)
    : 0

  return (
    <section className={styles.calcSection}>
      <div className={styles.calcInner}>

        <div className={styles.calcSectionHeader}>
          <p className={styles.sectionEyebrow}>The calculation</p>
          <h2 className={styles.sectionHeadline}>See your number.</h2>
          <p className={styles.sectionSub}>
            Four inputs. The exact dollar cost of your current trajectory — and what closing the gap looks like.
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

              {step === 0 && (
                <>
                  <h3 className={styles.calcQuestion}>How old are you?</h3>
                  <input
                    ref={inputRef}
                    type="number"
                    className={styles.calcInput}
                    value={age}
                    onChange={e => { setAge(e.target.value); setAgeErr('') }}
                    onKeyDown={handleKey}
                    placeholder="32"
                    min="18" max="70"
                  />
                  {ageErr && <p className={styles.calcErr}>{ageErr}</p>}
                  <p className={styles.calcHint}>We'll assume retirement at 65.</p>
                </>
              )}

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
                      placeholder="145,000"
                    />
                  </div>
                  {incomeErr && <p className={styles.calcErr}>{incomeErr}</p>}
                  <p className={styles.calcHint}>Pre-tax. Used to calculate your target investment rate.</p>
                </>
              )}

              {step === 2 && (
                <>
                  <h3 className={styles.calcQuestion}>How much do you invest each month?</h3>
                  <div className={styles.calcInputWrap}>
                    <span className={styles.calcInputPrefix}>$</span>
                    <input
                      ref={inputRef}
                      type="text"
                      inputMode="numeric"
                      className={`${styles.calcInput} ${styles.calcInputPrefixed}`}
                      value={monthly}
                      onChange={e => handleMonthlyChange(e.target.value)}
                      onKeyDown={handleKey}
                      placeholder="500"
                    />
                  </div>
                  {monthlyErr && <p className={styles.calcErr}>{monthlyErr}</p>}
                  <p className={styles.calcHint}>401(k) + IRA + brokerage. Enter 0 if nothing.</p>
                </>
              )}

              <div className={styles.calcActions}>
                {step > 0 && (
                  <button className={styles.btnGhost} onClick={() => setStep(s => s - 1)}>
                    ← Back
                  </button>
                )}
                <button className={styles.btnPrimary} onClick={advance}>
                  {step < 2 ? 'Continue →' : 'Calculate →'}
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

                {/* Left: big number */}
                <div>
                  <p className={styles.sectionEyebrow}>
                    {result.gap > 0 ? 'Your opportunity cost' : 'Your retirement trajectory'}
                  </p>
                  <div className={styles.revealNumber}>
                    {fmtFull(primaryHeadlineNum)}
                  </div>
                  <p className={styles.revealDesc}>
                    {result.gap > 0
                      ? `Retirement wealth forfeited by investing at your current rate (${result.savingsRatePct.toFixed(1)}%) instead of the recommended 20%.`
                      : `Projected retirement wealth at your current savings rate. You're ahead of most — here's what each year of compounding adds.`
                    }
                  </p>

                  {/* Cost of 1-year delay callout */}
                  <div className={styles.calcDelayCallout}>
                    <span className={styles.calcDelayLabel}>This year&apos;s delay alone</span>
                    <span className={styles.calcDelayVal}>{fmtFull(result.costDelay)}</span>
                  </div>

                  <p className={styles.revealNote}>
                    Based on 7% annualized real return.<br />
                    S&amp;P 500 historical average. Calculated in today&apos;s dollars.
                  </p>

                  <button
                    className={styles.calcRecalc}
                    onClick={() => { setStep(0); setAge(''); setIncome(''); setMonthly('') }}
                  >
                    ← Recalculate
                  </button>
                </div>

                {/* Right: breakdown card */}
                <div>
                  <div className={styles.revealCard}>
                    <div className={styles.revealCardRow}>
                      <span className={styles.revealCardLabel}>Years to retirement</span>
                      <span className={styles.revealCardVal}>{result.years}</span>
                    </div>
                    <div className={styles.revealCardRow}>
                      <span className={styles.revealCardLabel}>Current monthly investment</span>
                      <span className={styles.revealCardVal}>{fmtFull(result.currentMonthly)}</span>
                    </div>
                    <div className={styles.revealCardRow}>
                      <span className={styles.revealCardLabel}>Current savings rate</span>
                      <span className={styles.revealCardVal}>{result.savingsRatePct.toFixed(1)}%</span>
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
                          Get early access to Lumen and a full action plan at launch.
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
