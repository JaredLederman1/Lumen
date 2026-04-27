'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { countUp } from '@/lib/countUp'
import styles from './landing.module.css'

const HERO_FIGURE = 43_200
const COUNT_DURATION_MS = 2000

export default function HeroWatchReport() {
  const figureRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (figureRef.current) {
      countUp(figureRef.current, HERO_FIGURE, COUNT_DURATION_MS)
    }
  }, [])

  return (
    <section className={styles.hero}>
      <p className={styles.heroEyebrow}>What we found this year</p>

      <p className={styles.heroFigure}>
        $<span ref={figureRef}>0</span>
      </p>

      <h1 className={styles.heroHeadline}>
        We found this because we never stopped looking.
      </h1>

      <p className={styles.heroSubhead}>
        Illumin watches your financial defaults so you can act on what they cost you.
      </p>

      <div className={styles.heroCtaRow}>
        <Link href="/auth/signup" className={styles.btnPrimary}>
          Get started
        </Link>
        <a href="#the-watch" className={styles.btnGhostLink}>
          How the watch works
        </a>
      </div>
    </section>
  )
}
