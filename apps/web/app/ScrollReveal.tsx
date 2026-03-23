'use client'

import { useRef, type ReactNode } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'

interface Props {
  children: ReactNode
  className?: string
  /** How far into the viewport the element must be before fully revealed (0–1). Default 0.35 */
  threshold?: number
  /** Starting Y offset in px. Default 48 */
  distance?: number
  style?: React.CSSProperties
}

/**
 * Wraps children in a motion.div whose opacity and translateY are driven
 * purely by scroll progress — no snap-in, no intersection threshold pop.
 * Starts revealing when the element's top edge hits 90% of the viewport
 * and is fully visible by the time it reaches `threshold` of the viewport.
 */
export default function ScrollReveal({
  children,
  className,
  threshold = 0.38,
  distance = 48,
  style,
}: Props) {
  const ref = useRef<HTMLDivElement>(null)

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: [`start 0.92`, `start ${threshold}`],
  })

  const opacity = useTransform(scrollYProgress, [0, 1], [0, 1])
  const y       = useTransform(scrollYProgress, [0, 1], [distance, 0])

  return (
    <motion.div ref={ref} style={{ opacity, y, ...style }} className={className}>
      {children}
    </motion.div>
  )
}
