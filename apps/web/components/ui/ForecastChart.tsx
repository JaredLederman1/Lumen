'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

// SVG fill and stroke attributes do not resolve var() references, so hex
// values below mirror the warm-dark palette in globals.css.

interface ForecastChartProps {
  data: { month: string; balance: number; projected: boolean }[]
  emergencyFundMonths: number
  height?: number
}

function formatK(value: number) {
  return `$${(value / 1000).toFixed(0)}k`
}

export default function ForecastChart({ data, emergencyFundMonths, height = 220 }: ForecastChartProps) {
  // Build chart data with overlap at the transition point so the line is continuous.
  // The last actual point is duplicated into the projected series.
  const lastActualIdx = data.findLastIndex(d => !d.projected)
  const chartData = data.map((d, i) => ({
    month: d.month,
    actual: d.projected ? null : d.balance,
    projected: d.projected || i === lastActualIdx ? d.balance : null,
  }))

  return (
    <div>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(247,230,193,0.08)" />
          <XAxis
            dataKey="month"
            tick={{ fill: '#847B68', fontSize: 10, fontFamily: 'var(--font-mono)' }}
            axisLine={false}
            tickLine={false}
            padding={{ left: 16, right: 16 }}
          />
          <YAxis
            tickFormatter={formatK}
            tick={{ fill: '#847B68', fontSize: 10, fontFamily: 'var(--font-mono)' }}
            axisLine={false}
            tickLine={false}
            width={40}
          />
          <Tooltip
            formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Balance']}
            contentStyle={{
              backgroundColor: 'var(--color-surface-elevated)',
              border: '1px solid var(--color-border-strong)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--color-text)',
              fontFamily: 'var(--font-mono)',
              fontSize: '13px',
              boxShadow: '0 4px 16px rgba(0,0,0,0.40)',
            }}
          />
          <Line
            type="monotone"
            dataKey="actual"
            stroke="#C79A42"
            strokeWidth={2}
            dot={false}
            connectNulls={false}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="projected"
            stroke="#C79A42"
            strokeWidth={2}
            strokeDasharray="6 4"
            strokeOpacity={0.5}
            dot={false}
            connectNulls={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
      <div style={{
        marginTop: '20px',
        padding: '14px 18px',
        backgroundColor: emergencyFundMonths < 6
          ? 'var(--color-negative-bg)'
          : emergencyFundMonths < 12
            ? 'var(--color-gold-subtle)'
            : 'var(--color-positive-bg)',
        border: `1px solid ${
          emergencyFundMonths < 6
            ? 'var(--color-negative-border)'
            : emergencyFundMonths < 12
              ? 'var(--color-border-strong)'
              : 'var(--color-positive-border)'
        }`,
        borderRadius: 'var(--radius-md)',
        display: 'flex',
        flexDirection: 'column' as const,
        gap: '8px',
      }}>
        {(() => {
          const toneColor =
            emergencyFundMonths < 6
              ? 'var(--color-negative)'
              : emergencyFundMonths < 12
                ? 'var(--color-gold)'
                : 'var(--color-positive)'
          return (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '19px', color: toneColor }}>◎</span>
                <span style={{ fontSize: '14px', fontFamily: 'var(--font-mono)', color: toneColor, letterSpacing: '0.02em' }}>
                  Projected emergency fund coverage: <strong>{emergencyFundMonths.toFixed(1)} months</strong>
                </span>
              </div>
              {emergencyFundMonths < 6 && (
                <p style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--color-negative)', letterSpacing: '0.02em', margin: '0 0 0 29px', lineHeight: 1.6 }}>
                  Your emergency fund is below the recommended 6-month minimum. Prioritize building this buffer before other financial goals.
                </p>
              )}
              {emergencyFundMonths >= 6 && emergencyFundMonths < 12 && (
                <p style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--color-gold)', letterSpacing: '0.02em', margin: '0 0 0 29px', lineHeight: 1.6 }}>
                  You meet the minimum, but consider saving more in case of emergency. 12 months of coverage provides a stronger safety net.
                </p>
              )}
            </>
          )
        })()}
      </div>
    </div>
  )
}
