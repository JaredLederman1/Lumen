'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import styles from './FloatingNav.module.css'

export default function FloatingNav() {
  const [docked, setDocked] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const thresholdRef = useRef(0)

  useEffect(() => {
    const measure = () => {
      const ctas = document.querySelector('[data-hero-ctas]')
      if (ctas) {
        const rect = ctas.getBoundingClientRect()
        thresholdRef.current = window.scrollY + rect.bottom
      }
    }

    measure()
    const timer = setTimeout(measure, 500)

    const onScroll = () => {
      if (thresholdRef.current > 0) {
        setDocked(window.scrollY > thresholdRef.current)
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', measure, { passive: true })
    return () => {
      clearTimeout(timer)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', measure)
    }
  }, [])

  // Close menu on scroll
  useEffect(() => {
    if (!menuOpen) return
    const close = () => setMenuOpen(false)
    window.addEventListener('scroll', close, { passive: true })
    return () => window.removeEventListener('scroll', close)
  }, [menuOpen])

  const scrollTo = (id: string) => {
    setMenuOpen(false)
    if (id === 'top') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <>
      {/* ── Desktop nav pill ─────────────────────────────── */}
      <nav className={`${styles.nav} ${docked ? styles.docked : ''}`}>
        <span className={styles.wordmark}>Illumin</span>

        <div className={styles.linksWrap}>
          <a
            href="#features"
            className={styles.link}
            onClick={e => {
              e.preventDefault()
              scrollTo('features')
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
            scrollTo('email-signup')
          }}
        >
          Get started
        </a>
      </nav>

      {/* ── Mobile hamburger button ──────────────────────── */}
      <button
        className={`${styles.hamburger} ${menuOpen ? styles.hamburgerOpen : ''}`}
        onClick={() => setMenuOpen(!menuOpen)}
        aria-label="Toggle menu"
      >
        <span className={styles.hamburgerLine} />
        <span className={styles.hamburgerLine} />
        <span className={styles.hamburgerLine} />
      </button>

      {/* ── Mobile dropdown ──────────────────────────────── */}
      {menuOpen && (
        <div className={styles.overlay} onClick={() => setMenuOpen(false)} />
      )}
      <div className={`${styles.mobileMenu} ${menuOpen ? styles.mobileMenuOpen : ''}`}>
        <a href="#top" className={styles.mobileLink} onClick={e => { e.preventDefault(); scrollTo('top') }}>
          Illumin
        </a>
        <a href="#features" className={styles.mobileLink} onClick={e => { e.preventDefault(); scrollTo('features') }}>
          Features
        </a>
        <a href="#calculator" className={styles.mobileLink} onClick={e => { e.preventDefault(); scrollTo('calculator') }}>
          See your number
        </a>
        <a href="#email-signup" className={styles.mobileCta} onClick={e => { e.preventDefault(); scrollTo('email-signup') }}>
          Get started
        </a>
      </div>

      <Link href="/admin/login" className={styles.adminBtn}>
        Admin
      </Link>
    </>
  )
}
