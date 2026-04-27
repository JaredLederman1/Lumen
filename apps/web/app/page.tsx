import type { Metadata } from 'next'
import styles from './page.module.css'
import StockChartBg from '@/components/StockChartBg'
import FloatingNav from './FloatingNav'
import FeaturesSection from './FeaturesSection'
import LightFeaturesSection from './LightFeaturesSection'
import HeroCTAs from './HeroCTAs'

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
          <p className={styles.eyebrow}>WEALTH INTELLIGENCE</p>

          <h1 className={styles.headline}>
            Vigilance Compounds
          </h1>

          <p className={styles.subhead}>
            Most people have never had a financial advisor. Illumin stands watch over your complete financial picture and alerts you exactly what to do, starting with what inaction is costing you right now.
          </p>

          <HeroCTAs />
        </div>

      </section>

      {/* ── FEATURES ─────────────────────────────────────── */}
      <div id="features">
        <FeaturesSection />
        <LightFeaturesSection />
      </div>

      {/* ── FOOTER ──────────────────────────────────────── */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerLeft}>
            <span className={styles.footerWordmark}>Illumin</span>
            <span className={styles.footerCopy}>© 2026 Illumin</span>
          </div>
        </div>
      </footer>
    </>
  )
}
