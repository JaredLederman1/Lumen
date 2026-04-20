'use client'

import WidgetCard from '../widgets/WidgetCard'
import MetricDisplay from '../widgets/MetricDisplay'

interface Props {
  months: number | null
  target: number | null
}

export default function EmergencyFundGaugeCard({ months, target }: Props) {
  const t = target && target > 0 ? target : 6
  const m = months ?? 0
  const pct = Math.min(100, Math.round((m / t) * 100))
  return (
    <WidgetCard
      label="Emergency fund"
      title="Runway in months"
      subtitle={`Target ${t} months of essential expenses. You are ${pct}% of the way there.`}
    >
      <MetricDisplay
        value={months != null ? `${m.toFixed(1)} / ${t}` : '—'}
        label="Months of coverage"
      />
      <div
        style={{
          height: '4px',
          width: '100%',
          backgroundColor: 'var(--color-gold-subtle)',
          borderRadius: 'var(--radius-pill)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            backgroundColor: 'var(--color-gold)',
          }}
        />
      </div>
    </WidgetCard>
  )
}
