'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

// ─── Helpers ───────────────────────────────────────────────────────────────

function fv(monthlyPmt: number, months: number): number {
  if (months <= 0 || monthlyPmt <= 0) return 0
  const r = 0.07 / 12
  return monthlyPmt * ((Math.pow(1 + r, months) - 1) / r)
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n)
}

function formatNumber(n: number) {
  return new Intl.NumberFormat('en-US').format(n)
}

// ─── Shared styles ─────────────────────────────────────────────────────────

const heading: React.CSSProperties = {
  fontFamily: 'var(--font-serif)',
  fontSize: '36px',
  fontWeight: 300,
  color: 'var(--color-text)',
  lineHeight: 1.2,
  marginBottom: '14px',
}

const body: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '13px',
  color: 'var(--color-text-mid)',
  lineHeight: 1.7,
  letterSpacing: '0.02em',
}

const muted: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '10px',
  color: 'var(--color-text-muted)',
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
}

const continueBtn: React.CSSProperties = {
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
  cursor: 'pointer',
  marginTop: '48px',
}

const bigNumStyle: React.CSSProperties = {
  fontFamily: 'var(--font-serif)',
  fontSize: '80px',
  fontWeight: 300,
  color: 'var(--color-text)',
  lineHeight: 1,
  width: '100%',
  background: 'transparent',
  border: 'none',
  borderBottom: '1px solid var(--color-border)',
  outline: 'none',
  padding: '0 0 10px',
  textAlign: 'center',
  display: 'block',
  marginTop: '44px',
}

const sliderReadout: React.CSSProperties = {
  fontFamily: 'var(--font-serif)',
  fontSize: '60px',
  fontWeight: 300,
  color: 'var(--color-text)',
  lineHeight: 1,
  minWidth: '140px',
  textAlign: 'right',
  flexShrink: 0,
}

// ─── Page ──────────────────────────────────────────────────────────────────

type Step = 0 | 1 | 2 | 3 | 'reveal'

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep]               = useState<Step>(0)
  const [age, setAge]                 = useState<number | ''>('')
  const [ageRaw, setAgeRaw]           = useState('')
  const [income, setIncome]           = useState(120000)
  const [incomeDisplay, setIncomeDisplay] = useState('120,000')
  const [savingsRate, setSavingsRate] = useState(5)
  const [retirementAge, setRetirementAge] = useState(65)
  const [posting, setPosting]         = useState(false)
  const [postError, setPostError]     = useState<string | null>(null)

  const stepNum      = typeof step === 'number' ? step : null
  const filledSegs   = step === 'reveal' ? 4 : (step as number) + 1
  const savingsPct   = (savingsRate / 50) * 100
  const retirePct    = ((retirementAge - 45) / (75 - 45)) * 100

  // ── Revenue calculations for reveal ──────────────────────────────────────
  const ageNum           = typeof age === 'number' ? Math.max(16, Math.min(80, age)) : 0
  const yearsToRetire    = Math.max(0, retirementAge - ageNum)
  const monthlyInvest    = (income * savingsRate / 100) / 12
  const months           = yearsToRetire * 12
  const wealthNow        = fv(monthlyInvest, months)
  const wealthMinus1Yr   = fv(monthlyInvest, Math.max(0, months - 12))
  const opportunityCost  = Math.max(0, wealthNow - wealthMinus1Yr)
  const wealthAt20       = fv((income * 0.20) / 12, months)

  // ── Income input handler ─────────────────────────────────────────────────
  const handleIncomeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/,/g, '').replace(/[^0-9]/g, '')
    const num = parseInt(raw) || 0
    setIncome(num)
    setIncomeDisplay(num ? formatNumber(num) : '')
  }

  // ── Step navigation ──────────────────────────────────────────────────────
  const handleContinue = async () => {
    if (typeof step !== 'number') return
    if (step < 3) {
      setStep((step + 1) as Step)
      return
    }
    // Step 3 → reveal: POST then show
    setPosting(true)
    setPostError(null)
    try {
      await fetch('/api/user/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ age: ageNum, annualIncome: income, savingsRate, retirementAge }),
      })
    } catch {
      // Non-fatal; reveal regardless
    }
    setStep('reveal')
    setPosting(false)
  }

  const stepVariants = {
    hidden:  { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0 },
    exit:    { opacity: 0, y: -8 },
  }

  const transition = { duration: 0.25, ease: 'easeOut' as const }

  // ── Steps content ────────────────────────────────────────────────────────
  const renderStep = () => {
    if (step === 'reveal') return null

    return (
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          variants={stepVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          transition={transition}
        >
          {/* Step 0: Age */}
          {step === 0 && (
            <div>
              <h1 style={heading}>How old are you?</h1>
              <p style={body}>Your age determines how many compounding years remain.</p>
              <input
                type="text"
                inputMode="numeric"
                value={ageRaw}
                onChange={e => {
                  const raw = e.target.value.replace(/[^0-9]/g, '')
                  setAgeRaw(raw)
                  const n = parseInt(raw)
                  setAge(raw === '' || isNaN(n) ? '' : n)
                }}
                onBlur={() => {
                  const n = typeof age === 'number' ? age : 0
                  if (ageRaw !== '' && n < 16) { setAgeRaw('16'); setAge(16) }
                  if (ageRaw !== '' && n > 80) { setAgeRaw('80'); setAge(80) }
                }}
                placeholder="Enter your age"
                style={{
                  ...bigNumStyle,
                  color: ageRaw === '' ? 'var(--color-text-muted)' : 'var(--color-text)',
                }}
              />
              <p style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                color: 'var(--color-text-muted)',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                textAlign: 'center',
                marginTop: '10px',
              }}>
                years old
              </p>
            </div>
          )}

          {/* Step 1: Income */}
          {step === 1 && (
            <div>
              <h1 style={heading}>What is your annual income?</h1>
              <p style={body}>Gross income before tax, including any reliable bonus.</p>
              <div style={{
                display: 'flex',
                alignItems: 'baseline',
                borderBottom: '1px solid var(--color-border)',
                marginTop: '44px',
                paddingBottom: '10px',
              }}>
                <span style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: '72px',
                  fontWeight: 300,
                  color: 'var(--color-text-muted)',
                  lineHeight: 1,
                  flexShrink: 0,
                }}>$</span>
                <input
                  type="text"
                  value={incomeDisplay}
                  onChange={handleIncomeChange}
                  inputMode="numeric"
                  style={{
                    flex: 1,
                    fontSize: '72px',
                    fontFamily: 'var(--font-serif)',
                    fontWeight: 300,
                    color: 'var(--color-text)',
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    padding: '0 0 0 6px',
                    lineHeight: 1,
                  }}
                />
              </div>
            </div>
          )}

          {/* Step 2: Savings rate */}
          {step === 2 && (
            <div>
              <h1 style={heading}>What share of your income are you currently investing?</h1>
              <p style={body}>Include 401(k) contributions.</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginTop: '44px' }}>
                <input
                  type="range"
                  min={0}
                  max={50}
                  value={savingsRate}
                  onChange={e => setSavingsRate(Number(e.target.value))}
                  style={{
                    flex: 1,
                    background: `linear-gradient(to right, var(--color-gold) ${savingsPct}%, var(--color-border) ${savingsPct}%)`,
                  }}
                />
                <span style={sliderReadout}>{savingsRate}%</span>
              </div>

              {/* Live dollar calculator */}
              <div style={{
                marginTop: '28px',
                padding: '20px 22px',
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: '2px',
              }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '10px',
                    color: 'var(--color-text-muted)',
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                  }}>
                    That&apos;s
                  </span>
                  <span style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: '32px',
                    fontWeight: 300,
                    color: 'var(--color-gold)',
                    lineHeight: 1,
                  }}>
                    {fmt((income * savingsRate / 100) / 12)}
                    <span style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '11px',
                      color: 'var(--color-text-muted)',
                      letterSpacing: '0.08em',
                      marginLeft: '6px',
                    }}>/ month</span>
                  </span>
                </div>
                <p style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  color: 'var(--color-text-muted)',
                  lineHeight: 1.65,
                  letterSpacing: '0.02em',
                  margin: 0,
                }}>
                  This is what flows into your savings and investment accounts after every expense (rent, food, utilities, everything) is already paid.
                </p>
              </div>

              <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <p style={muted}>National median: 5%</p>
                <p style={muted}>Recommended: 15–20%</p>
              </div>
            </div>
          )}

          {/* Step 3: Retirement age */}
          {step === 3 && (
            <div>
              <h1 style={heading}>At what age do you plan to retire?</h1>
              <p style={body}>We will use this to project your long-term wealth trajectory.</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginTop: '44px' }}>
                <input
                  type="range"
                  min={45}
                  max={75}
                  value={retirementAge}
                  onChange={e => setRetirementAge(Number(e.target.value))}
                  style={{
                    flex: 1,
                    background: `linear-gradient(to right, var(--color-gold) ${retirePct}%, var(--color-border) ${retirePct}%)`,
                  }}
                />
                <span style={sliderReadout}>{retirementAge}</span>
              </div>
              <p style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                color: 'var(--color-text-muted)',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                textAlign: 'right',
                marginTop: '8px',
              }}>
                years old
              </p>
            </div>
          )}

          {postError && (
            <p style={{
              marginTop: '16px',
              fontSize: '12px',
              color: 'var(--color-negative)',
              fontFamily: 'var(--font-mono)',
            }}>
              {postError}
            </p>
          )}

          <button
            onClick={handleContinue}
            disabled={posting}
            style={{ ...continueBtn, opacity: posting ? 0.65 : 1, cursor: posting ? 'not-allowed' : 'pointer' }}
          >
            {posting ? 'Calculating…' : 'Continue'}
          </button>
        </motion.div>
      </AnimatePresence>
    )
  }

  // ── Reveal ───────────────────────────────────────────────────────────────
  const renderReveal = () => (
    <motion.div
      key="reveal"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      style={{ width: '100%', maxWidth: '880px' }}
    >
      {/* Two-column */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '56px', marginBottom: '52px', alignItems: 'start' }}>
        {/* Left */}
        <div>
          <p style={{ ...muted, marginBottom: '20px' }}>Cost of waiting one year</p>
          <p style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '76px',
            fontWeight: 300,
            color: 'var(--color-text)',
            lineHeight: 1,
            letterSpacing: '-0.01em',
            marginBottom: '6px',
          }}>
            {fmt(opportunityCost)}
          </p>
          {/* Annual urgency badge */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: 'rgba(196,168,130,0.10)',
            border: '1px solid var(--color-gold)',
            borderRadius: '2px',
            padding: '5px 12px',
            marginBottom: '24px',
          }}>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              color: 'var(--color-gold)',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              fontWeight: 500,
            }}>
              Every. Single. Year.
            </span>
          </div>
          <p style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '20px',
            fontWeight: 300,
            color: 'var(--color-text)',
            lineHeight: 1.45,
            marginBottom: '16px',
          }}>
            This is not a one-time loss. Every year you delay, you forfeit this amount in retirement wealth, permanently.
          </p>
          <p style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '16px',
            fontWeight: 300,
            color: 'var(--color-text-mid)',
            lineHeight: 1.5,
            marginBottom: '20px',
          }}>
            Wait 5 years and the true cost is <strong style={{ color: 'var(--color-text)' }}>{fmt(opportunityCost * 5)}</strong>. Wait 10 years: <strong style={{ color: 'var(--color-text)' }}>{fmt(opportunityCost * 10)}</strong>. The clock does not pause.
          </p>
          <p style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            color: 'var(--color-text-muted)',
            lineHeight: 1.7,
            letterSpacing: '0.02em',
          }}>
            Based on 7% annualized real return. S&amp;P 500 historical average. Calculated in today&apos;s dollars.
          </p>
        </div>

        {/* Right: breakdown card */}
        <div style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: '2px',
          padding: '28px',
        }}>
          {[
            { label: 'Years to retirement',                      value: `${yearsToRetire} yrs` },
            { label: 'Current monthly investment',               value: fmt(monthlyInvest) },
            { label: 'Projected wealth at current savings rate', value: fmt(wealthNow) },
            { label: 'Projected wealth at 20% savings rate',     value: fmt(wealthAt20) },
          ].map(({ label, value }, i, arr) => (
            <div
              key={label}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                paddingBottom: '18px',
                marginBottom: i < arr.length - 1 ? '18px' : 0,
                borderBottom: i < arr.length - 1 ? '1px solid var(--color-border)' : 'none',
              }}
            >
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                color: 'var(--color-text-muted)',
                letterSpacing: '0.04em',
                maxWidth: '140px',
                lineHeight: 1.5,
              }}>
                {label}
              </span>
              <span style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '20px',
                fontWeight: 400,
                color: 'var(--color-text)',
                flexShrink: 0,
                marginLeft: '16px',
              }}>
                {value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* CTA buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
        <Link
          href="/dashboard/accounts"
          style={{
            display: 'block',
            padding: '14px 48px',
            backgroundColor: 'var(--color-gold)',
            border: 'none',
            borderRadius: '2px',
            color: 'var(--color-surface)',
            fontSize: '12px',
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            fontWeight: 500,
            textDecoration: 'none',
            textAlign: 'center',
          }}
        >
          Connect your accounts
        </Link>
        <Link
          href="/dashboard"
          style={{
            fontSize: '12px',
            fontFamily: 'var(--font-mono)',
            color: 'var(--color-text-muted)',
            textDecoration: 'none',
            letterSpacing: '0.06em',
          }}
        >
          Continue to dashboard
        </Link>
      </div>
    </motion.div>
  )

  // ── Shell ─────────────────────────────────────────────────────────────────
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'var(--color-bg)',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Progress bar: 4 segments */}
      <div style={{ height: '2px', display: 'flex', gap: '2px', flexShrink: 0 }}>
        {[0, 1, 2, 3].map(i => (
          <div
            key={i}
            style={{
              flex: 1,
              backgroundColor: i < filledSegs ? 'var(--color-gold)' : 'var(--color-border)',
              transition: 'background-color 350ms ease',
            }}
          />
        ))}
      </div>

      {/* Top bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '28px 40px',
        flexShrink: 0,
      }}>
        <div style={{
          fontFamily: 'var(--font-serif)',
          fontSize: '16px',
          fontWeight: 400,
          color: 'var(--color-gold)',
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
        }}>
          Illumin
        </div>
        {stepNum !== null && (
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            color: 'var(--color-text-muted)',
            letterSpacing: '0.1em',
          }}>
            {stepNum + 1} / 4
          </span>
        )}
      </div>

      {/* Content area */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px 40px 60px',
      }}>
        {step === 'reveal' ? (
          renderReveal()
        ) : (
          <div style={{ width: '100%', maxWidth: '480px' }}>
            {renderStep()}
          </div>
        )}
      </div>
    </div>
  )
}
