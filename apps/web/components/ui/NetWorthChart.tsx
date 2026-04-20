'use client'

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'

interface DataPoint {
  date: string
  netWorth: number
}

function fmtAxisY(value: number): string {
  const abs = Math.abs(value)
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `${(value / 1_000).toFixed(0)}K`
  return String(value)
}

function fmtMonthYear(dateStr: string): string {
  const [year, month] = dateStr.split('-').map(Number)
  const d = new Date(year, month - 1, 1)
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

function CustomTooltip({ active, payload, label }: {
  active?: boolean
  payload?: Array<{ value: number }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  const value = payload[0].value
  return (
    <div style={{
      background: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: '2px',
      padding: '10px 14px',
    }}>
      <p style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '10px',
        color: 'var(--color-text-muted)',
        marginBottom: '4px',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
      }}>
        {label ? fmtMonthYear(label) : ''}
      </p>
      <p style={{
        fontFamily: 'var(--font-serif)',
        fontSize: '16px',
        color: 'var(--color-text)',
      }}>
        {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)}
      </p>
    </div>
  )
}

export default function NetWorthChart({
  data,
  height = 220,
}: {
  data: DataPoint[]
  height?: number
}) {
  const firstDate = data[0]?.date ?? ''
  const lastDate = data[data.length - 1]?.date ?? ''

  const xTickFormatter = (dateStr: string) => {
    if (dateStr === firstDate || dateStr === lastDate) return fmtMonthYear(dateStr)
    return ''
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
        <defs>
          <linearGradient id="nwGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-positive)" stopOpacity={0.15} />
            <stop offset="100%" stopColor="var(--color-positive)" stopOpacity={0} />
          </linearGradient>
        </defs>

        <CartesianGrid
          vertical={false}
          horizontal={true}
          horizontalCoordinatesGenerator={({ height: h }) => [
            h * 0.25,
            h * 0.5,
            h * 0.75,
          ]}
          stroke="var(--color-border)"
          strokeDasharray="2 4"
        />

        <XAxis
          dataKey="date"
          tickFormatter={xTickFormatter}
          tick={{ fontFamily: 'var(--font-mono)', fontSize: 10, fill: 'var(--color-text-muted)' }}
          axisLine={false}
          tickLine={false}
          interval={0}
          padding={{ left: 24, right: 24 }}
        />

        <YAxis
          tickFormatter={fmtAxisY}
          tick={{ fontFamily: 'var(--font-mono)', fontSize: 10, fill: 'var(--color-text-muted)' }}
          axisLine={false}
          tickLine={false}
          width={48}
        />

        <Tooltip content={<CustomTooltip />} />

        <Area
          type="monotone"
          dataKey="netWorth"
          stroke="var(--color-positive)"
          strokeWidth={1.5}
          fill="url(#nwGradient)"
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
