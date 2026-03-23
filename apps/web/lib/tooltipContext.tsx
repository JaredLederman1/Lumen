'use client'

import { createContext, useCallback, useContext, useState } from 'react'
import type { ReactNode } from 'react'

export interface TooltipSource {
  label: string
  value: number
  type: 'account' | 'average' | 'computed' | 'transaction'
  detail?: string
}

export interface TooltipData {
  title: string
  total: number
  sources: TooltipSource[]
  computationNote?: string
  accentColor?: string
  rect: DOMRect
}

interface TooltipContextValue {
  active: TooltipData | null
  show: (data: TooltipData) => void
  hide: () => void
}

export const TooltipContext = createContext<TooltipContextValue>({
  active: null,
  show: () => {},
  hide: () => {},
})

export function TooltipProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<TooltipData | null>(null)
  const show = useCallback((data: TooltipData) => setActive(data), [])
  const hide = useCallback(() => setActive(null), [])

  return (
    <TooltipContext.Provider value={{ active, show, hide }}>
      {children}
    </TooltipContext.Provider>
  )
}

export function useTooltip() {
  return useContext(TooltipContext)
}
