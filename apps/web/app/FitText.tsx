'use client'

import { useEffect, useRef, type ElementType, type ReactNode } from 'react'

export default function FitText({
  as: Tag = 'h1',
  className,
  children,
}: {
  as?: ElementType
  className?: string
  children: ReactNode
}) {
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const fit = () => {
      el.style.fontSize = ''
      for (let i = 0; i < 4; i++) {
        const available = el.clientWidth
        if (el.scrollWidth <= available) break
        const current = parseFloat(getComputedStyle(el).fontSize)
        const ratio = available / el.scrollWidth
        el.style.fontSize = `${Math.floor(current * ratio)}px`
      }
    }

    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(fit)
    }

    return () => ro.disconnect()
  }, [])

  return (
    <Tag ref={ref} className={className} style={{ whiteSpace: 'nowrap' }}>
      {children}
    </Tag>
  )
}
