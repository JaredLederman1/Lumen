'use client'

import NetWorthChart from '@/components/ui/NetWorthChart'
import { useNetWorthHistoryQuery } from '@/lib/queries'
import WidgetCard from './WidgetCard'

const fmt = (n: number) => {
  const abs = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Math.abs(n))
  return n >= 0 ? `+${abs}` : `-${abs}`
}

export default function NetWorthWidget() {
  const { data: nwHistory } = useNetWorthHistoryQuery()

  const canChart =
    !!nwHistory && nwHistory.history.length >= 2 && nwHistory.hasAssetAccount

  if (!canChart) {
    return (
      <WidgetCard
        label="Net worth"
        title="Building history"
        subtitle="Chart renders once we have at least two data points from an asset account."
      />
    )
  }

  return (
    <WidgetCard label="Net worth over time">
      <div style={{ display: 'flex', gap: '24px', marginBottom: '8px' }}>
        <div>
          <p style={{
            fontFamily: 'var(--font-sans)', fontSize: '11px', fontWeight: 500,
            color: 'var(--color-text-muted)', textTransform: 'uppercase',
            letterSpacing: '0.06em', marginBottom: '4px',
          }}>30d change</p>
          <p style={{
            fontFamily: 'var(--font-display)', fontSize: '16px',
            color: nwHistory.change30d >= 0 ? 'var(--color-positive)' : 'var(--color-negative)',
          }}>{fmt(nwHistory.change30d)}</p>
        </div>
        <div>
          <p style={{
            fontFamily: 'var(--font-sans)', fontSize: '11px', fontWeight: 500,
            color: 'var(--color-text-muted)', textTransform: 'uppercase',
            letterSpacing: '0.06em', marginBottom: '4px',
          }}>All time</p>
          <p style={{
            fontFamily: 'var(--font-display)', fontSize: '16px',
            color: nwHistory.changeAllTime >= 0 ? 'var(--color-positive)' : 'var(--color-negative)',
          }}>{fmt(nwHistory.changeAllTime)}</p>
        </div>
      </div>
      <NetWorthChart data={nwHistory.history} height={180} />
    </WidgetCard>
  )
}
