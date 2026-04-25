'use client'

import { CSSProperties } from 'react'
import Link from 'next/link'
import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useRecurringQuery } from '@/lib/queries'
import type { RecurringMerchant } from '@/app/api/recurring/route'
import WidgetCard from './WidgetCard'
import WidgetSkeleton, { WIDGET_REVEAL } from './WidgetSkeleton'

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Math.max(0, Math.round(n)))

const ctaLink: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '11px',
  letterSpacing: '0.08em',
  color: 'var(--color-gold)',
  textDecoration: 'none',
}

const merchantRow: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  fontFamily: 'var(--font-mono)',
  fontSize: '12px',
  color: 'var(--color-text-mid)',
}

const secondaryLine: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '12px',
  color: 'var(--color-text-mid)',
  margin: 0,
}

interface Summary {
  count: number
  total: number
  topMerchants: [string, number][]
}

// Adapter: bridges /api/recurring's signed monthly estimates to the positive
// numbers RecurringChargesWidget renders. Kept local because it has one caller
// and lifting it to a shared module would invent a parallel convention.
function adaptRecurringSummary(input: {
  recurring: RecurringMerchant[]
  totalMonthlyEstimate: number
  totalCount: number
}): Summary {
  const topMerchants: [string, number][] = [...input.recurring]
    .sort(
      (a, b) =>
        Math.abs(b.estimatedMonthlyAmount) - Math.abs(a.estimatedMonthlyAmount),
    )
    .slice(0, 3)
    .map(r => [r.merchantName ?? r.name, Math.abs(r.estimatedMonthlyAmount)])

  return {
    count: input.totalCount,
    total: Math.abs(input.totalMonthlyEstimate),
    topMerchants,
  }
}

export default function RecurringChargesWidget() {
  const { data, isPending, isError } = useRecurringQuery<RecurringMerchant>()

  const summary = useMemo<Summary | null>(() => {
    if (!data) return null
    return adaptRecurringSummary({
      recurring: data.recurring,
      totalMonthlyEstimate: data.totalMonthlyEstimate,
      totalCount: data.totalCount,
    })
  }, [data])

  if (isPending) {
    return <WidgetSkeleton variant="metric" />
  }

  if (isError || !summary) {
    return (
      <WidgetCard
        variant="metric"
        eyebrow="Recurring charges"
        columns={[{ caption: 'Unavailable', hero: '—' }]}
        secondary={
          <p style={secondaryLine}>
            We could not load recurring charges right now.
          </p>
        }
        cta={
          <Link href="/dashboard/recurring" style={ctaLink}>
            View all &rarr;
          </Link>
        }
      />
    )
  }

  if (summary.count === 0) {
    return (
      <WidgetCard
        variant="metric"
        eyebrow="Recurring charges"
        columns={[{ caption: 'No recurring charges detected', hero: fmt(0) }]}
        secondary={
          <p style={secondaryLine}>
            Once a merchant bills you on a regular cadence, it will appear here.
          </p>
        }
        cta={
          <Link href="/dashboard/recurring" style={ctaLink}>
            View all &rarr;
          </Link>
        }
      />
    )
  }

  return (
    <motion.div {...WIDGET_REVEAL}>
      <WidgetCard
        variant="metric"
        eyebrow="Recurring charges"
        columns={[
          {
            caption: `${summary.count} merchant${summary.count === 1 ? '' : 's'}, estimated monthly`,
            hero: fmt(summary.total),
          },
        ]}
        secondary={
          summary.topMerchants.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {summary.topMerchants.map(([name, amt]) => (
                <div key={name} style={merchantRow}>
                  <span>{name}</span>
                  <span>{fmt(amt)}</span>
                </div>
              ))}
            </div>
          ) : null
        }
        cta={
          <Link href="/dashboard/recurring" style={ctaLink}>
            View all &rarr;
          </Link>
        }
      />
    </motion.div>
  )
}
