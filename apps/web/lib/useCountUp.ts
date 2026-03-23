'use client'

import { useEffect, useRef, useState } from 'react'

export function useCountUp(target: number, duration = 900, skip = false): number {
  const [value, setValue] = useState(0)
  const rafRef   = useRef<number | null>(null)
  const startRef = useRef<number | null>(null)

  useEffect(() => {
    if (skip) {
      setValue(target)
      return
    }

    startRef.current = null
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)

    const step = (timestamp: number) => {
      if (startRef.current === null) startRef.current = timestamp
      const elapsed  = timestamp - startRef.current
      const progress = Math.min(elapsed / duration, 1)
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(target * eased)
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step)
      } else {
        setValue(target)
      }
    }
    rafRef.current = requestAnimationFrame(step)
    return () => { if (rafRef.current !== null) cancelAnimationFrame(rafRef.current) }
  }, [target, duration, skip])

  return value
}
