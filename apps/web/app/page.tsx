import type { Metadata } from 'next'
import styles from './page.module.css'
import StockChartBg from '@/components/StockChartBg'
import FloatingNav from './FloatingNav'
import FeaturesSection from './FeaturesSection'
import LightFeaturesSection from './LightFeaturesSection'
import HeroCTAs from './HeroCTAs'

export const metadata: Metadata = {
  title: "Illumin: You can't fix what you can't see.",
  description: 'Illumin watches your financial defaults so you can act on what they cost you.',
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
          <p className={styles.eyebrow}>THE WATCH</p>

          <h1 className={styles.headline}>
            The watch never stops. The cost never hides.
          </h1>

          <p className={styles.subhead}>
            Illumin watches your financial defaults so you can act on what they cost you.
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
