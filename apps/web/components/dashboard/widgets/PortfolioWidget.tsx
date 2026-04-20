'use client'

import Link from 'next/link'
import { usePortfolioQuery } from '@/lib/queries'
import DonutChart from '@/components/ui/DonutChart'
import WidgetCard from './WidgetCard'

interface Alloc {
  label: string
  value: number
  percentage: number
}

interface PortfolioResponse {
  totalValue: number
  allocationByType: Alloc[]
  hasHoldings: boolean
}

// SVG fill does not resolve var() references, so the palette mirrors the
// warm-dark tokens in globals.css. Keep in sync if the tokens change.
const PALETTE = ['#C79A42', '#5AB48A', '#B55A3A', '#7A95AA', '#AC8858', '#8A7866']

export default function PortfolioWidget() {
  const { data } = usePortfolioQuery<PortfolioResponse>()

  return (
    <WidgetCard label="Portfolio" title="Asset allocation">
      {!data?.hasHoldings ? (
        <p
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '12px',
            color: 'var(--color-text-muted)',
            margin: 0,
          }}
        >
          Link an investment account to see your allocation.
        </p>
      ) : (
        <DonutChart
          data={data.allocationByType.map((a, i) => ({
            category: a.label,
            amount: a.value,
            color: PALETTE[i % PALETTE.length],
          }))}
        />
      )}
      <Link
        href="/dashboard/portfolio"
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          letterSpacing: '0.08em',
          color: 'var(--color-gold)',
          textDecoration: 'none',
          alignSelf: 'flex-start',
        }}
      >
        Full breakdown →
      </Link>
    </WidgetCard>
  )
}
