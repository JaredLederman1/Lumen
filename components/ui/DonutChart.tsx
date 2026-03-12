'use client'

import { motion } from 'framer-motion'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

interface DonutChartProps {
  data: { category: string; amount: number; color: string }[]
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

const PALETTE = ['#B8913A', '#2D6A4F', '#8B4513', '#4A6785', '#9B7B4A', '#7A6A5A']

export default function DonutChart({ data }: DonutChartProps) {
  const total = data.reduce((sum, d) => sum + d.amount, 0)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut', delay: 0.1 }}
      style={{ display: 'flex', alignItems: 'center', gap: '28px', flexWrap: 'wrap' }}
    >
      <div style={{ width: '180px', height: '180px', flexShrink: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={80}
              dataKey="amount"
              strokeWidth={2}
              stroke="#FFFFFF"
            >
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={PALETTE[index % PALETTE.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => formatCurrency(Number(value))}
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
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div style={{ flex: 1, minWidth: '160px' }}>
        {data.map((item, index) => (
          <div
            key={item.category}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '10px',
              paddingBottom: '10px',
              borderBottom: '1px solid rgba(184,145,58,0.08)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
              <div style={{
                width: '6px',
                height: '6px',
                backgroundColor: PALETTE[index % PALETTE.length],
                flexShrink: 0,
              }} />
              <span style={{
                fontSize: '11px',
                color: '#6B5D4A',
                fontFamily: 'var(--font-mono)',
                letterSpacing: '0.03em',
              }}>
                {item.category}
              </span>
            </div>
            <span style={{
              fontSize: '11px',
              color: '#1A1714',
              fontFamily: 'var(--font-mono)',
              fontWeight: 500,
            }}>
              {((item.amount / total) * 100).toFixed(0)}%
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  )
}
