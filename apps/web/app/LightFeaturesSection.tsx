'use client'

import { useRef, useEffect, useState } from 'react'
import { useScroll } from 'framer-motion'
import { countUp } from '@/lib/countUp'
import styles from './page.module.css'
import ScrollReveal from './ScrollReveal'

const SPARKLINE      = '0,72 28,68 56,71 84,60 112,55 140,57 168,46 196,40 224,34 252,27 280,20'
const SPARKLINE_AREA = `0,72 ${SPARKLINE.split(' ').slice(1).join(' ')} 280,80 0,80`

const BALANCES = [
  { label: '12 mo ago', value: '$94,200'  },
  { label: '6 mo ago',  value: '$108,500' },
  { label: 'Today',     value: '$124,850' },
]

export default function LightFeaturesSection() {
  const figureRef  = useRef<HTMLSpanElement>(null)
  const row0Ref    = useRef<HTMLDivElement>(null)
  const [counted, setCounted] = useState(false)

  // Trigger countUp once the opportunity cost row has scrolled 30% into view
  const { scrollYProgress } = useScroll({
    target: row0Ref,
    offset: ['start 0.9', 'start 0.3'],
  })

  useEffect(() => {
    return scrollYProgress.on('change', (v) => {
      if (v > 0.4 && !counted && figureRef.current) {
        setCounted(true)
        countUp(figureRef.current, 23600, 1600)
      }
    })
  }, [counted, scrollYProgress])

  return (
    <section className={styles.lightFeatures}>

      <ScrollReveal>
        <div className={styles.featuresHeader}>
          <h2 className={styles.featuresHeadline}>The number your advisor would show you first.</h2>
          <p className={styles.featuresDesc}>
            Inaction has a dollar amount. Illumin calculates it from your real balances and projects it 30 years forward. This is the mechanic that changes behavior.
          </p>
        </div>
      </ScrollReveal>

      {/* ── ROW 1: Opportunity Cost ───────────────────────── */}
      <ScrollReveal>
        <div ref={row0Ref} className={`${styles.featureRow} ${styles.visible}`}>
          <div className={styles.featureLeft}>
            <span className={styles.featureLabel}>Opportunity Cost</span>
            <h3 className={styles.featureH3}>The price of inaction.</h3>
            <p className={styles.featureText}>
              Your idle cash has a cost. Illumin calculates exactly what it would be worth invested versus sitting in a checking account, and surfaces that number every time you log in. The gap is yours to close.
            </p>
          </div>

          <div className={styles.featureRight}>
            <div className={styles.invertedCard}>
              <p className={styles.invCardLabel}>Cost of waiting one year</p>
              <p className={styles.invCardFigure}>
                $<span ref={figureRef}>0</span>
              </p>
              <div className={styles.invCardBreakdown}>
                <span>Unrealized gains&nbsp;&nbsp;·&nbsp;&nbsp;$18,200</span>
                <span>Compounding cost&nbsp;&nbsp;·&nbsp;&nbsp;$5,200</span>
              </div>
            </div>
          </div>
        </div>
      </ScrollReveal>

      {/* ── ROW 2: Net Worth ──────────────────────────────── */}
      <ScrollReveal>
        <div className={`${styles.featureRow} ${styles.featureRowReverse} ${styles.visible}`}>
          <div className={styles.featureLeft}>
            <span className={styles.featureLabel}>Net Worth</span>
            <h3 className={styles.featureH3}>The number that actually measures progress.</h3>
            <p className={styles.featureText}>
              Every account in one place, updating automatically. Assets, liabilities, investments, and debt. The one number that tells you if you are actually moving forward.
            </p>
          </div>

          <div className={styles.featureRight}>
            <div className={styles.invertedCard}>
              <svg
                viewBox="0 0 280 80"
                width="100%"
                height="80"
                preserveAspectRatio="none"
                aria-hidden="true"
                className={styles.sparkline}
              >
                <polygon
                  points={SPARKLINE_AREA}
                  fill="var(--color-accent)"
                  fillOpacity={0.08}
                />
                <polyline
                  points={SPARKLINE}
                  fill="none"
                  stroke="var(--color-accent)"
                  strokeWidth={1.5}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              </svg>

              <div className={styles.sparkBalances}>
                {BALANCES.map((b) => (
                  <div key={b.label} className={styles.sparkBalance}>
                    <span className={styles.sparkBalanceLabel}>{b.label}</span>
                    <span className={styles.sparkBalanceValue}>{b.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </ScrollReveal>

    </section>
  )
}
