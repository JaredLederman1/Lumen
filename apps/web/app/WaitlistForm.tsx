'use client'

import { useState } from 'react'
import styles from './page.module.css'

export default function WaitlistForm() {
  const [email, setEmail]           = useState('')
  const [emailError, setEmailError] = useState<string | null>(null)
  const [submitted, setSubmitted]   = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) { setEmailError('Email is required.'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError('Please enter a valid email address.')
      return
    }
    setEmailError(null)
    setSubmitting(true)
    try {
      await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
    } finally {
      setSubmitting(false)
      setSubmitted(true)
    }
  }

  return (
    <div className={styles.waitlistWrap}>
      <form className={styles.waitlistForm} onSubmit={handleSubmit} noValidate>
        <input
          type="email"
          className={styles.waitlistInput}
          placeholder="Your email address"
          value={email}
          onChange={e => { setEmail(e.target.value); setEmailError(null) }}
          autoComplete="email"
        />
        {submitted ? (
          <span className={styles.waitlistSubmitted}>
            You&apos;re on the list
          </span>
        ) : (
          <button type="submit" className={styles.btnPrimary} disabled={submitting}>
            {submitting ? 'Adding…' : 'Get early access'}
          </button>
        )}
      </form>
      {emailError && <p className={styles.waitlistError}>{emailError}</p>}
      {submitted && <p className={styles.waitlistSuccess}>We&apos;ll be in touch.</p>}
    </div>
  )
}
