'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts'
import type { OpportunityData } from '@/app/api/opportunity/route'

// ─── Formatters ───────────────────────────────────────────────────────────────

const fmtCurrency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

function formatYAxis(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`
  return `$${value.toFixed(0)}`
}

// ─── Count-up hook ────────────────────────────────────────────────────────────

function useCountUp(target: number, duration = 1200): number {
  const [value, setValue] = useState(0)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    if (target === 0) { setValue(0); return }
    const start = performance.now()
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.floor(eased * target))
      if (progress < 1) rafRef.current = requestAnimationFrame(tick)
      else setValue(target)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [target, duration])

  return value
}

// ─── Chart tooltip ────────────────────────────────────────────────────────────

function makeTooltip(currentAge: number) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function ProjectionTooltip({ active, payload, label }: any) {
    if (!active || !payload?.length) return null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const invested = payload.find((p: any) => p.dataKey === 'withInvestment')?.value ?? 0
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const idle = payload.find((p: any) => p.dataKey === 'withoutInvestment')?.value ?? 0
    const displayAge = currentAge + (Number(label) - 1)
    return (
      <div style={{
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: '2px',
        padding: '10px 14px',
        fontFamily: 'var(--font-mono)',
        fontSize: '13px',
        color: 'var(--color-text-muted)',
        boxShadow: '0 4px 16px rgba(0,0,0,0.40)',
        lineHeight: 1.7,
      }}>
        <div style={{ color: 'var(--color-text)', marginBottom: '4px', letterSpacing: '0.06em' }}>
          Age {displayAge}
        </div>
        <div style={{ color: 'var(--color-positive)' }}>
          Invested: {fmtCurrency.format(Number(invested))}
        </div>
        <div>
          Idle: {fmtCurrency.format(Number(idle))}
        </div>
      </div>
    )
  }
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const card: React.CSSProperties = {
  backgroundColor: 'var(--color-surface)',
  border: '1px solid var(--color-gold-border)',
  borderRadius: '2px',
  padding: '28px',
}

const sectionLabel: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '12px',
  color: 'var(--color-text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.16em',
  marginBottom: '22px',
}

const statLabel: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '12px',
  color: 'var(--color-text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.12em',
  marginBottom: '6px',
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OpportunityPage() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<OpportunityData | null>(null)
  const [containerWidth, setContainerWidth] = useState(0)
  const chartContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/opportunity')
      .then(r => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const el = chartContainerRef.current
    if (!el) return
    const observer = new ResizeObserver(entries => {
      setContainerWidth(entries[0].contentRect.width)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [loading])

  const animatedCost = useCountUp(data?.oneYearCost ?? 0)

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '320px' }}>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', color: 'var(--color-text-muted)', letterSpacing: '0.06em' }}>
          Loading...
        </p>
      </div>
    )
  }

  if (!data) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '320px' }}>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', color: 'var(--color-text-muted)', letterSpacing: '0.06em' }}>
          Unable to load opportunity data. Connect an account to get started.
        </p>
      </div>
    )
  }

  const { age, retirementAge, projectionSeries } = data
  const yearsToRetirement = retirementAge - age

  // Ticks at year 1 (current age) then every 5 years, plus the final year
  const ageTicks: number[] = []
  for (let y = 1; y <= yearsToRetirement; y += 5) ageTicks.push(y)
  if (ageTicks[ageTicks.length - 1] !== yearsToRetirement) ageTicks.push(yearsToRetirement)

  // Fill the available container width; expand further when the data demands it
  const chartWidth = Math.max(containerWidth || 640, yearsToRetirement * 30)

  const ProjectionTooltip = makeTooltip(age)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Hero statement */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut', delay: 0 }}
        style={{ ...card, padding: '36px' }}
      >
        <p style={sectionLabel}>Opportunity Cost</p>

        {/* Main figure */}
        <p style={{
          fontFamily: 'var(--font-serif)',
          fontSize: '62px',
          fontWeight: 400,
          color: 'var(--color-negative)',
          lineHeight: 1,
          marginBottom: '12px',
        }}>
          {fmtCurrency.format(animatedCost)}
        </p>

        <p style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '16px',
          color: 'var(--color-text-muted)',
          lineHeight: 1.6,
          marginBottom: '24px',
        }}>
          estimated cost of leaving {fmtCurrency.format(data.idleCash)} uninvested for one year
        </p>

        {/* Divider */}
        <div style={{ height: '1px', backgroundColor: 'var(--color-border)', marginBottom: '24px' }} />

        {/* Supporting stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <div>
            <p style={statLabel}>5-Year Cost</p>
            <p style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '26px',
              fontWeight: 400,
              color: 'var(--color-negative)',
              lineHeight: 1,
            }}>
              {fmtCurrency.format(data.fiveYearCost)}
            </p>
          </div>
          <div>
            <p style={statLabel}>10-Year Cost</p>
            <p style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '26px',
              fontWeight: 400,
              color: 'var(--color-negative)',
              lineHeight: 1,
            }}>
              {fmtCurrency.format(data.tenYearCost)}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Projection chart */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut', delay: 0.08 }}
        style={card}
      >
        <p style={sectionLabel}>
          Growth Projection: Age {age} to {retirementAge}
        </p>

        {/* Scrollable chart wrapper — ref measures available width */}
        <div ref={chartContainerRef} style={{ overflowX: 'auto', overflowY: 'hidden', paddingBottom: '4px' }}>
          <LineChart
            width={chartWidth}
            height={260}
            data={projectionSeries}
            margin={{ top: 4, right: 20, bottom: 0, left: 8 }}
          >
            <CartesianGrid
              horizontal
              vertical={false}
              stroke="var(--color-grid-line)"
            />
            <XAxis
              dataKey="year"
              type="number"
              domain={[1, yearsToRetirement]}
              ticks={ageTicks}
              tickFormatter={(y: number) => String(age + y - 1)}
              tick={{ fill: '#6B7A8D', fontSize: 10, fontFamily: 'var(--font-mono)' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={formatYAxis}
              tick={{ fill: '#6B7A8D', fontSize: 10, fontFamily: 'var(--font-mono)' }}
              axisLine={false}
              tickLine={false}
              width={52}
            />
            <Tooltip content={<ProjectionTooltip />} />
            <Line
              type="monotone"
              dataKey="withInvestment"
              stroke="var(--color-positive)"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="withoutInvestment"
              stroke="var(--color-text-muted)"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              dot={false}
            />
          </LineChart>
        </div>

        {/* Legend */}
        <div style={{
          display: 'flex',
          gap: '24px',
          marginTop: '16px',
          paddingTop: '14px',
          borderTop: '1px solid var(--color-border)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '20px', height: '2px', backgroundColor: 'var(--color-positive)' }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--color-text-muted)', letterSpacing: '0.06em' }}>
              Invested at 7%/yr
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '20px', height: '2px',
              backgroundImage: 'repeating-linear-gradient(90deg, var(--color-text-muted) 0, var(--color-text-muted) 4px, transparent 4px, transparent 8px)',
            }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--color-text-muted)', letterSpacing: '0.06em' }}>
              Idle cash at 2%/yr
            </span>
          </div>
        </div>
      </motion.div>

    </div>
  )
}
