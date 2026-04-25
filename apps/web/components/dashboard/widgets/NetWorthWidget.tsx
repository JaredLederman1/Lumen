'use client'

import { CSSProperties } from 'react'
import { motion } from 'framer-motion'
import NetWorthChart from '@/components/ui/NetWorthChart'
import { useNetWorthHistoryQuery } from '@/lib/queries'
import WidgetCard from './WidgetCard'
import WidgetSkeleton, { WIDGET_REVEAL } from './WidgetSkeleton'

const fmt = (n: number) => {
  const abs = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Math.abs(n))
  return n >= 0 ? `+${abs}` : `-${abs}`
}

const emptyCopy: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '12px',
  color: 'var(--color-text-mid)',
  lineHeight: 1.55,
  margin: 0,
}

export default function NetWorthWidget() {
  const { data: nwHistory, isPending } = useNetWorthHistoryQuery()

  if (isPending) return <WidgetSkeleton variant="chart" />

  const canChart =
    !!nwHistory && nwHistory.history.length >= 2 && nwHistory.hasAssetAccount

  if (!canChart) {
    return (
      <WidgetCard
        variant="metric"
        eyebrow="Net worth"
        columns={[{ caption: 'Building history', hero: '—' }]}
        secondary={
          <p style={emptyCopy}>
            Chart renders once we have at least two data points from an asset account.
          </p>
        }
      />
    )
  }

  return (
    <motion.div {...WIDGET_REVEAL}>
      <WidgetCard
        variant="metric"
        eyebrow="Net worth over time"
        columns={[
          {
            caption: '30d change',
            hero: fmt(nwHistory.change30d),
            heroColor:
              nwHistory.change30d >= 0
                ? 'var(--color-positive)'
                : 'var(--color-negative)',
          },
        ]}
        secondary={<NetWorthChart data={nwHistory.history} height={160} />}
      />
    </motion.div>
  )
}
