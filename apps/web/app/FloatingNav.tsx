'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import styles from './FloatingNav.module.css'

export default function FloatingNav() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <>
    <nav className={`${styles.nav} ${scrolled ? styles.scrolled : ''}`}>
      <span className={styles.wordmark}>Illumin</span>

      <div className={styles.linksWrap}>
        <a
          href="#features"
          className={styles.link}
          onClick={e => {
            e.preventDefault()
            document.getElementById('features')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }}
        >
          Features
        </a>
      </div>

      <a
        href="#email-signup"
        className={styles.cta}
        onClick={e => {
          e.preventDefault()
          document.getElementById('email-signup')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }}
      >
        Get started
      </a>
    </nav>

    <Link href="/admin/login" className={styles.adminBtn}>
      Admin
    </Link>
    </>
  )
}
