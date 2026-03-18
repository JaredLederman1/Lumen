import type { Metadata } from 'next'
import styles from './page.module.css'
import StockChartBg from '@/components/StockChartBg'
import OppCostCalculator from '@/components/OppCostCalculator'
import FloatingNav from './FloatingNav'
import FeaturesSection from './FeaturesSection'
import LightFeaturesSection from './LightFeaturesSection'
import RevealText from './RevealText'
import HeroCTAs from './HeroCTAs'
import WaitlistForm from './WaitlistForm'

export const metadata: Metadata = {
  title: "Illumin: You can't fix what you can't see.",
  description: 'Institutional-grade wealth management for everyone.',
}

export default function Page() {
  return (
    <>
      {/* Ensures page always starts at top on load */}
      <script dangerouslySetInnerHTML={{ __html: 'history.scrollRestoration="manual";window.scrollTo(0,0);' }} />
      <FloatingNav />

      {/* ── HERO ─────────────────────────────────────────── */}
      <section className={styles.hero}>

        <div className={styles.chart} aria-hidden="true">
          <StockChartBg />
        </div>
        <div className={styles.vignette} aria-hidden="true" />

        <div className={styles.content}>
          <p className={styles.eyebrow}>Personal Finance</p>

          <h1 className={styles.headline}>
            The 1%&apos;s Playbook,<br />Now for Everyone.
          </h1>

          <p className={styles.subhead}>
            Illumin shows you the cost of every financial decision you&apos;re not making.
          </p>

          <HeroCTAs />
        </div>

      </section>

      {/* ── FEATURES ─────────────────────────────────────── */}
      <div id="features">
        <FeaturesSection />
        <LightFeaturesSection />
      </div>

      {/* ── CALCULATOR ───────────────────────────────────── */}
      <div id="calculator">
        <OppCostCalculator />
      </div>

      {/* ── CLOSING CTA ─────────────────────────────────── */}
      <section className={styles.ctaSection} id="email-signup">
        <div className={styles.vignette} aria-hidden="true" />

        <div className={styles.ctaContent}>
          <h2 className={styles.ctaHeadline}>
            <RevealText>Stop guessing. Start knowing.</RevealText>
          </h2>
          <p className={styles.ctaSubhead}>
            Illumin gives you the tools that used to cost thousands. Free, clear, and built for everyone.
          </p>
          <WaitlistForm />
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────── */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerLeft}>
            <span className={styles.footerWordmark}>Illumin</span>
            <span className={styles.footerCopy}>© 2026 Illumin</span>
          </div>
          <nav className={styles.footerRight} aria-label="Footer navigation">
            <a href="#features"     className={styles.footerLink}>Features</a>
            <a href="#calculator"   className={styles.footerLink}>How it works</a>
            <a href="/auth/login"   className={styles.footerLink}>Sign in</a>
          </nav>
        </div>
      </footer>
    </>
  )
}
