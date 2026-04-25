'use client'

import { CSSProperties } from 'react'
import { motion } from 'framer-motion'
import WidgetCard, { MetricColumn } from './WidgetCard'

type Variant = 'metric' | 'list' | 'chart'

const PULSE_DURATION_S = 1.5
const PULSE_OPACITY_LOW = 0.45
const PULSE_OPACITY_HIGH = 0.85

// Per-widget reveal motion. Used by every widget's real-content branch so the
// content fades in instead of snapping when its query resolves and the
// skeleton unmounts.
export const WIDGET_REVEAL = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, ease: 'easeOut' as const },
} as const

const blockBase: CSSProperties = {
  backgroundColor: 'var(--color-surface-2)',
  borderRadius: 'var(--radius-sm)',
}

const pulseAnim = {
  animate: { opacity: [PULSE_OPACITY_LOW, PULSE_OPACITY_HIGH, PULSE_OPACITY_LOW] },
  transition: {
    duration: PULSE_DURATION_S,
    ease: 'easeInOut' as const,
    repeat: Infinity,
  },
}

function Block({ width, height }: { width: number | string; height: number | string }) {
  return (
    <motion.div
      aria-hidden="true"
      {...pulseAnim}
      style={{ ...blockBase, width, height }}
    />
  )
}

function ListSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {[0, 1, 2, 3].map(i => (
        <div
          key={i}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <Block width="60%" height={12} />
          <Block width="22%" height={12} />
        </div>
      ))}
    </div>
  )
}

function ChartSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <Block width="100%" height={140} />
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
        <Block width="22%" height={10} />
        <Block width="22%" height={10} />
        <Block width="22%" height={10} />
      </div>
    </div>
  )
}

function MetricSecondary() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <Block width="80%" height={12} />
      <Block width="55%" height={12} />
    </div>
  )
}

export default function WidgetSkeleton({ variant }: { variant: Variant }) {
  if (variant === 'metric') {
    const columns: MetricColumn[] = [
      {
        caption: '',
        hero: <Block width={140} height={42} />,
      },
    ]
    return (
      <WidgetCard
        variant="metric"
        eyebrow=""
        columns={columns}
        secondary={<MetricSecondary />}
      />
    )
  }

  if (variant === 'chart') {
    return (
      <WidgetCard variant="chart" eyebrow="" caption="">
        <ChartSkeleton />
      </WidgetCard>
    )
  }

  return (
    <WidgetCard variant="list" eyebrow="">
      <ListSkeleton />
    </WidgetCard>
  )
}
