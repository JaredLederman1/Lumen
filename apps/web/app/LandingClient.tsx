'use client'

import { useRef, useState } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import Link from 'next/link'
import styles from './landing.module.css'
import OppCostCalculator from '@/components/OppCostCalculator'

const inView = {
  hidden:  { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: 'easeOut' as const } },
}

const FEATURES = [
  {
    num: '01',
    title: 'Net Worth & Account Aggregation',
    desc: 'Every place. Checking, savings, investments, 401(k), brokerage. A complete balance sheet, updated automatically.',
    tag: 'Foundation',
  },
  {
    num: '02',
    title: 'Financial Health Score',
    desc: 'A single number, 0 to 100, that scores your savings rate, debt health, investment behavior, and spending efficiency. With specific findings and next steps, not generic advice.',
    tag: 'Intelligence',
  },
  {
    num: '03',
    title: 'Opportunity Cost Visibility',
    desc: 'What is inaction costing you, in dollars, per year? Illumin calculates your personal number and surfaces it monthly: the mechanic that changes behavior.',
    tag: 'Clarity',
  },
  {
    num: '04',
    title: 'Investment & Portfolio Tools',
    desc: "Track holdings, allocation, and performance. Benchmark against the S&P 500. See where you're exposed and where you're leaving returns on the table.",
    tag: 'Portfolio',
  },
  {
    num: '05',
    title: 'Wealth Trajectory Projection',
    desc: 'Where are you headed at your current rate? Where could you be? The gap between those two lines is the product.',
    tag: 'Planning',
  },
]

export default function LandingClient() {
  const calcRef  = useRef<HTMLDivElement>(null)
  const ctaRef   = useRef<HTMLElement>(null)
  const emailRef = useRef<HTMLInputElement>(null)

  // Parallax section refs
  const statRef     = useRef<HTMLDivElement>(null)
  const problemRef  = useRef<HTMLElement>(null)
  const featuresRef = useRef<HTMLElement>(null)

  const [email, setEmail]           = useState('')
  const [emailError, setEmailError] = useState<string | null>(null)
  const [submitted, setSubmitted]   = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Hero: window scroll-based parallax
  const { scrollY } = useScroll()
  const heroCardsY   = useTransform(scrollY, [0, 900], [0, 100])
  const heroContentY = useTransform(scrollY, [0, 900], [0, 30])

  // Stat row parallax
  const { scrollYProgress: statP } = useScroll({ target: statRef, offset: ['start end', 'end start'] })
  const statY = useTransform(statP, [0, 1], [50, -50])

  // Problem section parallax
  const { scrollYProgress: problemP } = useScroll({ target: problemRef, offset: ['start end', 'end start'] })
  const problemHeaderY = useTransform(problemP, [0, 1], [60, -60])
  const problemGridY   = useTransform(problemP, [0, 1], [30, -30])

  // Features section parallax
  const { scrollYProgress: featuresP } = useScroll({ target: featuresRef, offset: ['start end', 'end start'] })
  const featuresHeaderY = useTransform(featuresP, [0, 1], [60, -60])
  const featuresListY   = useTransform(featuresP, [0, 1], [30, -30])

  // CTA section parallax (reuse ctaRef)
  const { scrollYProgress: ctaP } = useScroll({ target: ctaRef, offset: ['start end', 'end start'] })
  const ctaParallaxY = useTransform(ctaP, [0, 1], [40, -40])

  const scrollToCTA = () => {
    calcRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  const scrollToProblem = () => {
    problemRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const scrollToEmail = () => {
    ctaRef.current?.scrollIntoView({ behavior: 'smooth' })
    setTimeout(() => emailRef.current?.focus(), 650)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) {
      setEmailError('Email is required.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError('Please enter a valid email address.')
      return
    }
    setEmailError(null)
    setSubmitting(true)
    try {
      await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
    } finally {
      setSubmitting(false)
      setSubmitted(true)
    }
  }

  return (
    <div className={styles.wrapper}>

      {/* ── NAV ─────────────────────────────────────────────── */}
      <nav className={styles.nav}>
        <div className={styles.navLogo}>Illumin</div>
        <div className={styles.navRight}>
          <Link href="/admin/login" className={styles.navAdmin}>Admin</Link>
          <button onClick={scrollToEmail} className={styles.navCta}>Get early access</button>
        </div>
      </nav>

      {/* ── HERO ────────────────────────────────────────────── */}
      <section className={styles.hero}>

        {/* Blurred dashboard preview */}
        <motion.div className={styles.heroCardsWrap} style={{ y: heroCardsY }}>
          <div className={styles.heroCardsInner}>

            {/* Card 1: Portfolio balance */}
            <div className={styles.heroCard}>
              <p className={styles.heroCardHeader}>Portfolio</p>
              <p className={styles.heroCardValue}>$124,850</p>
              <p className={styles.heroCardSub}>+$3,240 this month</p>
            </div>

            {/* Card 2: Spending categories */}
            <div className={styles.heroCard}>
              <p className={styles.heroCardHeader}>This Month</p>
              <div className={styles.heroCardRow}>
                <span className={styles.heroCardRowLabel}>Housing</span>
                <span className={styles.heroCardRowVal}>$2,100</span>
              </div>
              <div className={styles.heroCardRow}>
                <span className={styles.heroCardRowLabel}>Food</span>
                <span className={styles.heroCardRowVal}>$480</span>
              </div>
              <div className={styles.heroCardRow}>
                <span className={styles.heroCardRowLabel}>Transport</span>
                <span className={styles.heroCardRowVal}>$340</span>
              </div>
              <div className={styles.heroCardRow}>
                <span className={styles.heroCardRowLabel}>Other</span>
                <span className={styles.heroCardRowVal}>$220</span>
              </div>
            </div>

            {/* Card 3: Opportunity cost */}
            <div className={styles.heroCard}>
              <p className={styles.heroCardHeader}>Inaction Cost</p>
              <p className={styles.heroCardValue}>$18,400</p>
              <p className={styles.heroCardSub}>per year left on the table</p>
            </div>

          </div>
        </motion.div>

        {/* Gradient overlay */}
        <div className={styles.heroGradient} aria-hidden="true" />

        {/* Content */}
        <motion.div className={styles.heroContentWrap} style={{ y: heroContentY }}>
          <h1 className={styles.heroHeadline}>
            You can&apos;t fix what you can&apos;t see.
          </h1>
          <p className={styles.heroSubhead}>
            Most people have never had a financial advisor. Illumin&apos;s engine reads your complete financial picture and tells you exactly what to do, starting with what inaction is costing you right now.
          </p>
          <div className={styles.heroActions}>
            <button onClick={scrollToCTA} className={styles.heroBtnPrimary}>
              CALCULATE YOUR COST
            </button>
            <button onClick={scrollToProblem} className={styles.heroBtnGhost}>
              SEE THE PLATFORM
            </button>
          </div>
        </motion.div>

      </section>

      {/* ── STAT ROW ────────────────────────────────────────── */}
      <motion.div
        ref={statRef}
        className={styles.statRow}
        variants={inView}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        style={{ y: statY }}
      >
        <div className={styles.stat}>
          <div className={styles.statNumber}>$127K</div>
          <div className={styles.statLabel}>Avg. annual cost of not optimizing</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statNumber}>Professional Grade</div>
          <div className={styles.statLabel}>Integrated wealth management</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statNumber}>0%</div>
          <div className={styles.statLabel}>Management fee</div>
        </div>
      </motion.div>

      <div className={styles.goldRule} />

      {/* ── PROBLEM ─────────────────────────────────────────── */}
      <motion.section
        ref={problemRef}
        className={`${styles.section} ${styles.centeredSection}`}
        variants={inView}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.1 }}
      >
        <motion.div style={{ y: problemHeaderY }}>
          <p className={styles.sectionEyebrow}>The problem</p>
          <h2 className={styles.sectionHeadline}>Wealth Management For All, Not Just Millionaires.</h2>
          <p className={styles.sectionSub}>
            Private banks and RIAs offer sophisticated financial planning: portfolio construction, tax optimization,
            wealth projections, exclusively to clients with millions in assets. Everyone else gets a budgeting app. Illumin closes that gap.
          </p>
        </motion.div>

        <motion.div className={styles.problemGrid} style={{ y: problemGridY }}>
          <div className={styles.problemRowHeader}><span className={styles.problemRowHeaderText}>Today</span></div>
          <div className={styles.problemCell}>
            <p className={styles.problemCellLabel}>Private wealth management</p>
            <p className={styles.problemCellText}>
              Portfolio construction, tax planning, wealth projections. <strong>Financial infrastructure that actually moves the needle.</strong>
            </p>
          </div>
          <div className={styles.problemCell}>
            <p className={styles.problemCellLabel}>What everyone else gets</p>
            <p className={styles.problemCellText}>
              Budgeting apps. Spending categories. <strong>Transaction lists.</strong> Tools designed for awareness, not optimization.
            </p>
          </div>
          <div className={styles.problemRowHeader}><span className={styles.problemRowHeaderText}>With Illumin</span></div>
          <div className={styles.problemCell}>
            <p className={styles.problemCellLabel}>The platform</p>
            <p className={styles.problemCellText}>
              Net worth tracking, portfolio analysis, cash flow intelligence, opportunity cost modeling, wealth trajectory projections, and a financial health score. <strong>A complete suite that outpaces what most RIAs offer their clients.</strong>
            </p>
          </div>
          <div className={styles.problemCell}>
            <p className={styles.problemCellLabel}>What changes</p>
            <p className={styles.problemCellText}>
              <strong>No minimums. No fees. No advisor required.</strong> Access that was kept from you, now yours by default.
            </p>
          </div>
        </motion.div>
      </motion.section>

      <div className={styles.goldRule} />

      {/* ── CALCULATOR ──────────────────────────────────────── */}
      <motion.div
        ref={calcRef}
        variants={inView}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.1 }}
      >
        <OppCostCalculator />
      </motion.div>

      <div className={styles.goldRule} />

      {/* ── FEATURES ────────────────────────────────────────── */}
      <motion.section
        ref={featuresRef}
        className={`${styles.section} ${styles.centeredSection}`}
        variants={inView}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.1 }}
      >
        <motion.div style={{ y: featuresHeaderY }}>
          <p className={styles.sectionEyebrow}>What Illumin does</p>
          <h2 className={styles.sectionHeadline}>Five pillars. One platform.</h2>
          <p className={styles.sectionSub}>
            The complete wealth management infrastructure, designed for people who have never had access to it.
          </p>
        </motion.div>

        <motion.div className={styles.featureList} style={{ y: featuresListY }}>
          {FEATURES.map(f => (
            <div key={f.num} className={styles.featureItem}>
              <span className={styles.featureNum}>{f.num}</span>
              <div className={styles.featureContent}>
                <p className={styles.featureTitle}>{f.title}</p>
                <p className={styles.featureDesc}>{f.desc}</p>
              </div>
              <span className={styles.featureTag}>{f.tag}</span>
            </div>
          ))}
        </motion.div>
      </motion.section>

      {/* ── CTA ─────────────────────────────────────────────── */}
      <motion.section
        ref={ctaRef}
        className={styles.ctaSection}
        variants={inView}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        style={{ y: ctaParallaxY }}
      >
        <h2 className={styles.ctaHeadline}>Find out what your finances are actually doing.</h2>
        <p className={styles.ctaSub}>Connect your accounts in two minutes. The engine analyzes your complete picture and tells you where you stand and what to do next. No advisor required. No minimum balance.</p>
        <form className={styles.ctaForm} onSubmit={handleSubmit} noValidate>
          <input
            ref={emailRef}
            type="email"
            className={styles.ctaInput}
            placeholder="Your email address"
            value={email}
            onChange={e => { setEmail(e.target.value); setEmailError(null) }}
            autoComplete="email"
          />
          {submitted ? (
            <span className={styles.btnPrimary} style={{ cursor: 'default' }}>
              ✓ You&apos;re on the list
            </span>
          ) : (
            <button type="submit" className={styles.btnPrimary} disabled={submitting}>
              {submitting ? 'Adding…' : 'Get early access'}
            </button>
          )}
        </form>
        {emailError && <p className={styles.ctaError}>{emailError}</p>}
        {submitted && <p className={styles.ctaSuccess}>We&apos;ll be in touch.</p>}
      </motion.section>

      {/* ── FOOTER ──────────────────────────────────────────── */}
      <footer className={styles.footer}>
        <div className={styles.footerLogo}>Illumin</div>
        <div className={styles.footerNote}>© 2026 Illumin. The financial advisor you never had access to.</div>
      </footer>

    </div>
  )
}
