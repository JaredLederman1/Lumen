'use client'

import { useRef } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { useTooltip } from '@/lib/tooltipContext'
import type { TooltipSource } from '@/lib/tooltipContext'

const defaultFormatter = (n: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n)

interface DataTooltipProps {
  value: number
  title: string
  sources: TooltipSource[]
  computationNote?: string
  accentColor?: string
  formatter?: (n: number) => string
  children?: ReactNode
  style?: CSSProperties
}

export default function DataTooltip({
  value,
  title,
  sources,
  computationNote,
  accentColor,
  formatter = defaultFormatter,
  children,
  style,
}: DataTooltipProps) {
  const spanRef = useRef<HTMLSpanElement>(null)
  const tooltip = useTooltip()

  const handleMouseEnter = () => {
    if (!spanRef.current) return
    const rect = spanRef.current.getBoundingClientRect()
    tooltip.show({ title, total: value, sources, computationNote, accentColor, rect })
  }

  return (
    <span
      ref={spanRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={tooltip.hide}
      style={{
        position: 'relative',
        display: 'inline-block',
        cursor: 'default',
        ...style,
      }}
    >
      {children ?? formatter(value)}
      <span
        style={{
          position: 'absolute',
          bottom: '-2px',
          left: 0,
          right: 0,
          height: 0,
          borderBottom: '1px dotted rgba(184,145,58,0.5)',
        }}
      />
    </span>
  )
}
