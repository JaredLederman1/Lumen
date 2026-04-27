import Link from 'next/link'
import styles from './landingpreview.module.css'

export default function TaglineFinalCTA() {
  return (
    <section className={styles.taglineSection}>
      <h2 className={styles.tagline}>You can&apos;t fix what you can&apos;t see.</h2>
      <Link href="/auth/signup" className={styles.btnPrimary}>
        Get started
      </Link>
    </section>
  )
}
