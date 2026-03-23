'use client'

import { useEffect, useState } from 'react'

/**
 * Returns true if the viewport is phone-width (<= 768px).
 * Uses resize listener so it responds to resize in dev tools.
 * In React Native this hook is replaced by: return true
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  return isMobile
}
