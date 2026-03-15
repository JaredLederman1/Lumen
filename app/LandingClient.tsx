'use client'

import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import styles from './landing.module.css'
import OppCostCalculator from '@/components/OppCostCalculator'

const fadeUp = {
  hidden:  { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
}

const inView = {
  hidden:  { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: 'easeOut' as const } },
}

const FEATURES = [
  {
    num: '01',
    title: 'The opportunity cost reveal',
    desc: 'Enter four numbers. See exactly what your current trajectory is costing you in retirement wealth — and what closing the gap looks like.',
    tag: 'Core',
  },
  {
    num: '02',
    title: 'Complete account aggregation',
    desc: 'Every account in one place. Checking, savings, investments, 401(k), brokerage. Your actual net worth, not an estimate.',
    tag: 'Core',
  },
  {
    num: '03',
    title: 'Monthly cost-of-waiting notification',
    desc: "One number, once a month. What this month's delay cost you. Not to create anxiety — to make the decision concrete.",
    tag: 'Retention',
  },
  {
    num: '04',
    title: 'Portfolio construction for high earners',
    desc: 'Advanced risk assessment and allocation tools for users with significant investable assets. Coming soon.',
    tag: 'HNWI',
  },
]

export default function LandingClient() {
  const calcRef  = useRef<HTMLDivElement>(null)
  const ctaRef   = useRef<HTMLElement>(null)
  const emailRef = useRef<HTMLInputElement>(null)
  const [email, setEmail]           = useState('')
  const [emailError, setEmailError] = useState<string | null>(null)
  const [submitted, setSubmitted]   = useState(false)

  const scrollToCTA = () => {
    calcRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  const scrollToEmail = () => {
    ctaRef.current?.scrollIntoView({ behavior: 'smooth' })
    setTimeout(() => emailRef.current?.focus(), 650)
  }

  const handleSubmit = (e: React.FormEvent) => {
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
    setSubmitted(true)
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
        <div className={styles.heroGrid} aria-hidden="true" />
        <div className={styles.heroOrb}  aria-hidden="true" />

        <div className={styles.heroRule} />

        <motion.p
          className={styles.heroEyebrow}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
        >
          Personal wealth management
        </motion.p>

        <motion.h1
          className={styles.heroHeadline}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.35 }}
        >
          You can&apos;t fix<br /><em>what you can&apos;t see.</em>
        </motion.h1>

        <motion.div
          className={styles.heroDivider}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.5 }}
        />

        <motion.p
          className={styles.heroTagline}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.6 }}
        >
          Illumin shows you the full financial picture — what you have, what you&apos;re missing,
          and exactly what inaction is costing you.
        </motion.p>

        <motion.div
          className={styles.heroActions}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.75 }}
        >
          <button onClick={scrollToCTA} className={`${styles.btnPrimary} ${styles.btnHero}`}>See your number</button>
        </motion.div>
      </section>

      {/* ── STAT ROW ────────────────────────────────────────── */}
      <motion.div
        className={styles.statRow}
        variants={inView}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
      >
        <div className={styles.stat}>
          <div className={styles.statNumber}>$127K</div>
          <div className={styles.statLabel}>Average opportunity cost per year of delay</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statNumber}>73%</div>
          <div className={styles.statLabel}>Of high earners invest below the recommended rate</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statNumber}>2 min</div>
          <div className={styles.statLabel}>To see your complete financial picture</div>
        </div>
      </motion.div>

      <div className={styles.goldRule} />

      {/* ── PROBLEM ─────────────────────────────────────────── */}
      <motion.section
        className={styles.section}
        variants={inView}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.1 }}
      >
        <p className={styles.sectionEyebrow}>The problem</p>
        <h2 className={styles.sectionHeadline}>Most high earners are financially blind.</h2>
        <p className={styles.sectionSub}>
          Not because they lack the information. Because no single tool has ever shown it to them clearly.
        </p>
        <div className={styles.problemGrid}>
          <div className={styles.problemCell}>
            <p className={styles.problemCellLabel}>What you know</p>
            <p className={styles.problemCellText}>
              Your salary is good. <strong>You&apos;re doing fine.</strong> There&apos;s money in your account at the end of the month.
            </p>
          </div>
          <div className={styles.problemCell}>
            <p className={styles.problemCellLabel}>What you don&apos;t see</p>
            <p className={styles.problemCellText}>
              Every month you wait costs you <strong>compounding wealth</strong> you will never recover. The gap is already larger than you think.
            </p>
          </div>
          <div className={styles.problemCell}>
            <p className={styles.problemCellLabel}>What most apps give you</p>
            <p className={styles.problemCellText}>
              Budgeting tools. Spending categories. <strong>Transaction lists.</strong> None of it tells you what you&apos;re actually losing.
            </p>
          </div>
          <div className={styles.problemCell}>
            <p className={styles.problemCellLabel}>What Illumin gives you</p>
            <p className={styles.problemCellText}>
              A single number. The real cost of your current trajectory — <strong>and what changes it.</strong>
            </p>
          </div>
        </div>
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
        className={styles.section}
        variants={inView}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.1 }}
      >
        <p className={styles.sectionEyebrow}>What Illumin does</p>
        <h2 className={styles.sectionHeadline}>Visibility that changes behavior.</h2>
        <p className={styles.sectionSub}>
          Every feature is designed around one question: what do you need to see to make better decisions?
        </p>
        <div className={styles.featureList}>
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
        </div>
      </motion.section>

      {/* ── CTA ─────────────────────────────────────────────── */}
      <motion.section
        ref={ctaRef}
        className={styles.ctaSection}
        variants={inView}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
      >
        <h2 className={styles.ctaHeadline}>Stay in the loop.</h2>
        <p className={styles.ctaSub}>Sign up to be first to know when Illumin launches.</p>
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
            <button type="submit" className={styles.btnPrimary}>
              Get early access
            </button>
          )}
        </form>
        {emailError && <p className={styles.ctaError}>{emailError}</p>}
        {submitted && <p className={styles.ctaSuccess}>We&apos;ll be in touch.</p>}
      </motion.section>

      {/* ── FOOTER ──────────────────────────────────────────── */}
      <footer className={styles.footer}>
        <div className={styles.footerLogo}>Illumin</div>
        <div className={styles.footerNote}>© 2026 Illumin. Financial clarity for what&apos;s ahead.</div>
      </footer>

    </div>
  )
}
