'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface ForecastChartProps {
  data: { month: string; balance: number; projected: boolean }[]
  emergencyFundMonths: number
}

function formatK(value: number) {
  return `$${(value / 1000).toFixed(0)}k`
}

export default function ForecastChart({ data, emergencyFundMonths }: ForecastChartProps) {
  const chartData = data.map(d => ({
    month: d.month,
    actual: d.projected ? null : d.balance,
    projected: d.projected ? d.balance : null,
  }))

  return (
    <div>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(184,145,58,0.12)" />
          <XAxis
            dataKey="month"
            tick={{ fill: '#A89880', fontSize: 10, fontFamily: 'var(--font-mono)' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={formatK}
            tick={{ fill: '#A89880', fontSize: 10, fontFamily: 'var(--font-mono)' }}
            axisLine={false}
            tickLine={false}
            width={40}
          />
          <Tooltip
            formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Balance']}
            contentStyle={{
              backgroundColor: '#FFFFFF',
              border: '1px solid rgba(184,145,58,0.25)',
              borderRadius: '2px',
              color: '#1A1714',
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
            }}
          />
          <Line
            type="monotone"
            dataKey="actual"
            stroke="#B8913A"
            strokeWidth={2}
            dot={false}
            connectNulls={false}
          />
          <Line
            type="monotone"
            dataKey="projected"
            stroke="#B8913A"
            strokeWidth={2}
            strokeDasharray="6 4"
            strokeOpacity={0.5}
            dot={false}
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>
      <div style={{
        marginTop: '20px',
        padding: '14px 18px',
        backgroundColor: 'rgba(45,106,79,0.06)',
        border: '1px solid rgba(45,106,79,0.18)',
        borderRadius: '2px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
      }}>
        <span style={{ fontSize: '16px', color: '#2D6A4F' }}>◎</span>
        <span style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: '#2D6A4F', letterSpacing: '0.02em' }}>
          Projected emergency fund coverage: <strong>{emergencyFundMonths.toFixed(1)} months</strong>
        </span>
      </div>
    </div>
  )
}
