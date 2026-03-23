'use client'

import styles from './page.module.css'

export default function HeroCTAs() {
  const scrollTo = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  return (
    <div className={styles.ctas}>
      <button className={styles.btnPrimary} onClick={() => scrollTo('calculator')}>
        CALCULATE YOUR COST
      </button>
      <button className={styles.btnGhost} onClick={() => scrollTo('features')}>
        SEE THE PLATFORM
      </button>
    </div>
  )
}
