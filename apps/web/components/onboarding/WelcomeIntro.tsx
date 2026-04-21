'use client'

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { TickingCounter } from './TickingCounter'

interface Props {
  onStart: () => void
}

const TARGET        = 14247.82
const CONTINUE_RATE = 0.5   // dollars per second, resumes after main count

// Cinematic intro timings (seconds, from mount). The sequence:
//   0.6s   counter + subtitle fade in, centered, full size
//   3.0s   main count finishes; counter continues slow climb
//   3.0s   counter + subtitle start translating up and shrinking
//   3.7s   headline "clarity changes everything." fades into center
//   4.5s   headline fade-in complete, begin 1s hold on "clarity" (no cursor)
//   5.5s   cursor fades in at the end of "clarity"
//   5.7s   cursor begins deleting "clarity" right-to-left at 110ms/char
//   6.47s  deletion complete, brief 250ms pause
//   6.72s  "Illumin" types in left-to-right at 110ms/char
//   7.49s  typing complete, cursor fades out
//   7.69s  cursor gone, "Illumin" sits final
//   8.0s   outlined "Begin" button fades in
//   9.5s   Begin button becomes interactive
const LOGO_DELAY            = 0.2
const COUNTER_START         = 0.6
const COUNTER_END           = 3.0
const CAPTION_START         = 1.0
const COUNTER_COLLAPSE_AT   = 3.0
const COUNTER_MOVE_DUR      = 0.9
const HEADLINE_START        = 3.7
// Absolute time from mount at which the cursor begins to fade in. This
// equals HEADLINE_START + headline fade duration (0.8s) + a full 1s hold on
// "clarity" without the cursor present.
const CURSOR_IN_AT_SEC      = 5.5
const CURSOR_FADE_MS        = 200
const DELETE_PER_CHAR_MS    = 110
const TYPE_PER_CHAR_MS      = 110
const PAUSE_BETWEEN_MS      = 250
const BUTTON_START          = 8.0
const BUTTON_READY          = 9.5
const EXIT_DURATION         = 0.5

const REDUCED_FADE = 1.2

const HEADLINE_FIRST_WORD  = 'clarity'
const HEADLINE_REPLACEMENT = 'Illumin'
const HEADLINE_TAIL        = ' changes everything.'

// 'hold'       — "clarity" sits visible with no cursor at all.
// 'cursor-in'  — cursor fades in at the end of "clarity".
// 'deleting'   — cursor solid, deleting chars right-to-left.
// 'pausing'    — empty word, cursor idle, brief pause.
// 'typing'     — cursor solid, typing "Illumin" left-to-right.
// 'cursor-out' — cursor fades out after the replacement finishes.
// 'done'       — "Illumin" final, no cursor.
type TypewriterPhase =
  | 'hold'
  | 'cursor-in'
  | 'deleting'
  | 'pausing'
  | 'typing'
  | 'cursor-out'
  | 'done'

// Phases 1 through 4 are intentionally uninterruptible. No click, scroll,
// keyboard, or touch input advances or skips the sequence. The Begin button
// itself is rendered with pointer-events: none and aria-disabled until
// BUTTON_READY.
export function WelcomeIntro({ onStart }: Props) {
  const [reducedMotion] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    try {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches
    } catch {
      return false
    }
  })

  const [buttonReady, setButtonReady] = useState(false)
  const [exiting, setExiting]         = useState(false)
  const buttonRef = useRef<HTMLButtonElement | null>(null)

  // Counter layout: starts centered at full size, slides up and shrinks once
  // the headline begins to appear so the screen re-balances. Reduced-motion
  // users get the collapsed state on mount.
  const [counterCollapsed, setCounterCollapsed] = useState<boolean>(reducedMotion)

  // Typewriter state for the first-word swap. `word` identifies which word
  // is currently displayed so styling (gold + serif on Illumin) can key off
  // it. `typed` is the visible substring for that word. Reduced-motion
  // users land straight on the final replacement word with no sequence.
  const [word, setWord] = useState<'first' | 'replacement'>(reducedMotion ? 'replacement' : 'first')
  const [typed, setTyped] = useState<string>(reducedMotion ? HEADLINE_REPLACEMENT : HEADLINE_FIRST_WORD)
  const [phase, setPhase] = useState<TypewriterPhase>(reducedMotion ? 'done' : 'hold')

  useEffect(() => {
    const readyAt = reducedMotion ? REDUCED_FADE * 1000 : BUTTON_READY * 1000
    const t = window.setTimeout(() => setButtonReady(true), readyAt)
    return () => window.clearTimeout(t)
  }, [reducedMotion])

  useEffect(() => {
    if (reducedMotion) return
    const t = window.setTimeout(
      () => setCounterCollapsed(true),
      COUNTER_COLLAPSE_AT * 1000,
    )
    return () => window.clearTimeout(t)
  }, [reducedMotion])

  // Kick off the typewriter sequence. After the headline finishes fading in
  // and "clarity" holds for a full second, transition to cursor-in. The
  // phase-driven effect below handles every subsequent transition.
  useEffect(() => {
    if (reducedMotion) return
    const t = window.setTimeout(() => setPhase('cursor-in'), CURSOR_IN_AT_SEC * 1000)
    return () => window.clearTimeout(t)
  }, [reducedMotion])

  // Phase-driven typewriter. Each scheduled step advances either the typed
  // substring or the phase itself. All timers are cleared on unmount. Phase
  // transitions happen inside the timer callbacks so this effect never
  // calls setState synchronously in its body.
  useEffect(() => {
    if (phase === 'cursor-in') {
      const t = window.setTimeout(() => setPhase('deleting'), CURSOR_FADE_MS)
      return () => window.clearTimeout(t)
    }
    if (phase === 'deleting') {
      if (typed.length === 0) {
        const t = window.setTimeout(() => {
          setWord('replacement')
          setPhase('typing')
        }, PAUSE_BETWEEN_MS)
        return () => window.clearTimeout(t)
      }
      const t = window.setTimeout(() => {
        setTyped(prev => prev.slice(0, -1))
      }, DELETE_PER_CHAR_MS)
      return () => window.clearTimeout(t)
    }
    if (phase === 'typing') {
      if (typed.length >= HEADLINE_REPLACEMENT.length) return
      const t = window.setTimeout(() => {
        const nextLen = typed.length + 1
        setTyped(HEADLINE_REPLACEMENT.slice(0, nextLen))
        if (nextLen >= HEADLINE_REPLACEMENT.length) setPhase('cursor-out')
      }, TYPE_PER_CHAR_MS)
      return () => window.clearTimeout(t)
    }
    if (phase === 'cursor-out') {
      const t = window.setTimeout(() => setPhase('done'), CURSOR_FADE_MS)
      return () => window.clearTimeout(t)
    }
  }, [phase, typed])

  // Focus the Begin button as soon as it becomes interactive so keyboard
  // users do not need to tab into an otherwise empty viewport.
  useEffect(() => {
    if (buttonReady) buttonRef.current?.focus()
  }, [buttonReady])

  const handleStart = () => {
    if (!buttonReady || exiting) return
    try {
      window.localStorage.setItem('illumin_onboarding_intro_seen', 'true')
    } catch {
      // localStorage may be unavailable (private mode); advance anyway.
    }
    setExiting(true)
    window.setTimeout(onStart, EXIT_DURATION * 1000)
  }

  const isReplacement = word === 'replacement'
  // The cursor only exists during the active animation window: it fades in
  // at the end of the 1s "clarity" hold, travels through delete/pause/type,
  // then fades out before the final "Illumin" settles. No blinking in any
  // phase — the cursor is either moving or absent. A CSS opacity transition
  // smooths the cursor-in and cursor-out fades.
  const cursorTargetOpacity =
    phase === 'hold' || phase === 'cursor-out' || phase === 'done' ? 0 : 1

  return (
    <AnimatePresence>
      {!exiting && (
        <motion.div
          key="welcome-intro"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: EXIT_DURATION, ease: 'easeOut' }}
          role="dialog"
          aria-label="Welcome to Illumin"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            backgroundColor: 'var(--color-bg)',
            color: 'var(--color-text)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 'clamp(24px, 5vw, 64px)',
            overflow: 'hidden',
            minHeight: '100dvh',
          }}
        >
          {/* Radial vignette, fades in during phase 1. */}
          <motion.div
            aria-hidden
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.3 }}
            transition={{
              duration: reducedMotion ? REDUCED_FADE : 0.8,
              ease: 'easeOut',
            }}
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'radial-gradient(ellipse 80% 60% at 50% 38%, color-mix(in srgb, var(--color-gold) 55%, transparent) 0%, transparent 62%)',
              pointerEvents: 'none',
            }}
          />

          {/* Illumin wordmark, top-left. */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{
              duration: reducedMotion ? REDUCED_FADE : 0.6,
              delay: reducedMotion ? 0 : LOGO_DELAY,
              ease: 'easeOut',
            }}
            style={{
              position: 'absolute',
              top: 'clamp(20px, 4vh, 40px)',
              left: 'clamp(20px, 5vw, 48px)',
              fontFamily: 'var(--font-display)',
              fontSize: '13px',
              fontWeight: 400,
              letterSpacing: '0.32em',
              textTransform: 'uppercase',
              color: 'var(--color-gold)',
            }}
          >
            Illumin
          </motion.div>

          {/* Counter + subtitle. Absolutely positioned so they can start
              centered and then glide up to the top as the headline arrives.
              The TickingCounter's continue-phase keeps it climbing during
              the move. */}
          <motion.div
            initial={{
              opacity: 0,
              top: '50%',
              translateX: '-50%',
              translateY: '-50%',
              scale: 1,
            }}
            animate={{
              opacity: 1,
              top: counterCollapsed ? '16vh' : '50%',
              translateX: '-50%',
              translateY: counterCollapsed ? '0%' : '-50%',
              scale: counterCollapsed ? 0.62 : 1,
            }}
            transition={{
              opacity: {
                duration: reducedMotion ? REDUCED_FADE : 0.4,
                delay: reducedMotion ? 0 : COUNTER_START,
                ease: 'easeOut',
              },
              top:         { duration: reducedMotion ? 0 : COUNTER_MOVE_DUR, ease: 'easeOut' },
              translateY:  { duration: reducedMotion ? 0 : COUNTER_MOVE_DUR, ease: 'easeOut' },
              scale:       { duration: reducedMotion ? 0 : COUNTER_MOVE_DUR, ease: 'easeOut' },
            }}
            style={{
              position: 'absolute',
              left: '50%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 'clamp(14px, 2.4vh, 24px)',
              width: '100%',
              maxWidth: '960px',
              transformOrigin: 'center top',
              willChange: 'transform, top',
            }}
          >
            <TickingCounter
              target={TARGET}
              mainStartSec={reducedMotion ? 0 : COUNTER_START}
              mainDurationSec={COUNTER_END - COUNTER_START}
              continueStartSec={reducedMotion ? REDUCED_FADE : COUNTER_END}
              continueRatePerSec={CONTINUE_RATE}
              reducedMotion={reducedMotion}
              ariaLabel="Estimated annual opportunity cost"
              style={{
                display: 'block',
                textAlign: 'center',
                fontFamily: 'var(--font-mono)',
                fontSize: 'clamp(48px, 14vw, 88px)',
                fontWeight: 400,
                letterSpacing: '-0.02em',
                lineHeight: 1,
                color: 'var(--color-text)',
              }}
            />
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{
                duration: reducedMotion ? REDUCED_FADE : 0.6,
                delay: reducedMotion ? 0 : CAPTION_START,
                ease: 'easeOut',
              }}
              style={{
                margin: 0,
                fontFamily: 'var(--font-sans)',
                fontSize: 'clamp(13px, 1.1vw, 14px)',
                color: 'var(--color-text-muted)',
                letterSpacing: '0.02em',
                lineHeight: 1.6,
                textAlign: 'center',
                maxWidth: '540px',
              }}
            >
              The average American leaves this much on the table every year.
            </motion.p>
          </motion.div>

          {/* Headline, vertically centered. First word is replaced via a
              character-by-character typewriter: "clarity" backspaces out,
              then "Illumin" types in. The tail ("changes everything.") is
              static throughout. */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: 0,
              right: 0,
              transform: 'translateY(-50%)',
              display: 'flex',
              justifyContent: 'center',
              pointerEvents: 'none',
              padding: '0 clamp(20px, 5vw, 48px)',
            }}
          >
            <motion.h1
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: reducedMotion ? REDUCED_FADE : 0.8,
                delay: reducedMotion ? 0 : HEADLINE_START,
                ease: 'easeOut',
              }}
              style={{
                margin: 0,
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(32px, 9vw, 64px)',
                fontWeight: 300,
                color: 'var(--color-text)',
                lineHeight: 1.1,
                letterSpacing: '-0.01em',
                textAlign: 'center',
                maxWidth: '760px',
              }}
            >
              <span
                aria-live="polite"
                style={{
                  display: 'inline-flex',
                  alignItems: 'baseline',
                  verticalAlign: 'baseline',
                }}
              >
                <span
                  style={{
                    display: 'inline-block',
                    whiteSpace: 'pre',
                    fontFamily: 'var(--font-display)',
                    color: isReplacement ? 'var(--color-gold)' : 'var(--color-text)',
                    fontWeight: isReplacement ? 400 : 300,
                    transition: 'color 150ms ease',
                  }}
                >
                  {typed}
                </span>
                <span
                  aria-hidden
                  style={{
                    display: 'inline-block',
                    width: '2px',
                    height: '0.9em',
                    marginLeft: '2px',
                    backgroundColor: 'var(--color-gold)',
                    alignSelf: 'center',
                    opacity: cursorTargetOpacity,
                    transition: `opacity ${CURSOR_FADE_MS}ms ease`,
                  }}
                />
              </span>
              {HEADLINE_TAIL}
            </motion.h1>
          </div>

          {/* Begin button. Outlined gold, understated, pulses gently once
              interactive. Anchored to the headline center with a fixed
              calc offset so the button always sits the same distance below
              the headline regardless of viewport height.

              A static wrapper handles the `translate(-50%, -50%)` centering
              via CSS. The child motion.div only animates opacity and scale.
              If centering were placed on the same element as the scale
              animation, framer-motion would overwrite the style transform
              each frame and the button would drift off center. */}
          <div
            style={{
              position: 'absolute',
              top: 'calc(50% + clamp(170px, 24vh, 260px))',
              left: '50%',
              transform: 'translate(-50%, -50%)',
            }}
          >
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              duration: reducedMotion ? REDUCED_FADE : 1.0,
              delay: reducedMotion ? 0 : BUTTON_START,
              ease: 'easeOut',
            }}
          >
            <motion.button
              ref={buttonRef}
              type="button"
              onClick={handleStart}
              aria-label="Begin onboarding"
              aria-disabled={!buttonReady}
              animate={
                buttonReady && !reducedMotion
                  ? { scale: [1, 1.015, 1] }
                  : { scale: 1 }
              }
              transition={
                buttonReady && !reducedMotion
                  ? { duration: 3, repeat: Infinity, ease: 'easeInOut' }
                  : { duration: 0 }
              }
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '48px',
                padding: '14px 40px',
                background: 'transparent',
                border: '1px solid var(--color-gold)',
                borderRadius: '2px',
                color: 'var(--color-gold)',
                fontFamily: 'var(--font-sans)',
                fontSize: '13px',
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                fontWeight: 500,
                cursor: buttonReady ? 'pointer' : 'default',
                pointerEvents: buttonReady ? 'auto' : 'none',
                transition: 'background-color 200ms ease, color 200ms ease',
              }}
              onMouseEnter={e => {
                if (!buttonReady) return
                e.currentTarget.style.backgroundColor = 'var(--color-gold)'
                e.currentTarget.style.color = 'var(--color-bg)'
              }}
              onMouseLeave={e => {
                if (!buttonReady) return
                e.currentTarget.style.backgroundColor = 'transparent'
                e.currentTarget.style.color = 'var(--color-gold)'
              }}
            >
              Begin
            </motion.button>
          </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
