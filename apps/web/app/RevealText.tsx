'use client'

import { useRef, type ReactNode } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'

export default function RevealText({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLSpanElement>(null)

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start 0.9', 'start 0.4'],
  })

  const opacity = useTransform(scrollYProgress, [0, 1], [0, 1])
  const y       = useTransform(scrollYProgress, [0, 1], [32, 0])

  return (
    <motion.span ref={ref} style={{ display: 'block', opacity, y }}>
      {children}
    </motion.span>
  )
}
