'use client'

import { ReactNode, FormEvent } from 'react'
import { motion } from 'framer-motion'
import { questionHeading, contextCopy, continueBtn } from './shared'

interface Props {
  question: string
  context?: string
  children: ReactNode
  canAdvance: boolean
  busy?: boolean
  continueLabel?: string
  onAdvance: () => void
  isMobile: boolean
  // When true, the entire form (heading, input, context, Continue) is
  // horizontally centered on the page rather than left-aligned. Used for
  // the first two onboarding questions (age and location) so they feel
  // like a cinematic landing screen before the LiveProjection sidecar
  // appears on the salary page.
  centered?: boolean
}

/**
 * The visual chassis for every one-question sub-screen in Steps 1, 2 and 4.
 * Presents a large serif question, a single input (rendered by the caller),
 * a short declarative context sentence, and a gold Continue button. Submit
 * via Enter is wired to onAdvance to keep keyboard flow fast.
 */
export function SubStepShell({
  question,
  context,
  children,
  canAdvance,
  busy = false,
  continueLabel = 'Continue',
  onAdvance,
  isMobile,
  centered = false,
}: Props) {
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (canAdvance && !busy) onAdvance()
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        width: '100%',
        maxWidth: '620px',
        display: 'flex',
        flexDirection: 'column',
        gap: isMobile ? '24px' : '36px',
        alignItems: centered ? 'center' : 'stretch',
        textAlign: centered ? 'center' : 'left',
        marginLeft: centered ? 'auto' : undefined,
        marginRight: centered ? 'auto' : undefined,
      }}
    >
      <motion.h1
        key={question}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        style={{
          ...questionHeading,
          textAlign: centered ? 'center' : 'left',
          width: '100%',
        }}
      >
        {question}
      </motion.h1>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          width: '100%',
          alignItems: centered ? 'center' : 'stretch',
        }}
      >
        {children}
        {context && (
          <p
            style={{
              ...contextCopy,
              textAlign: centered ? 'center' : 'left',
            }}
          >
            {context}
          </p>
        )}
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '18px',
          marginTop: '8px',
          width: '100%',
          justifyContent: centered ? 'center' : 'flex-start',
        }}
      >
        <button
          type="submit"
          disabled={!canAdvance || busy}
          style={{
            ...continueBtn,
            opacity: !canAdvance || busy ? 0.5 : 1,
            cursor: !canAdvance || busy ? 'not-allowed' : 'pointer',
          }}
        >
          {busy ? 'Saving…' : continueLabel}
          {!busy && (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          )}
        </button>
      </div>
    </form>
  )
}
