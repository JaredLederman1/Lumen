'use client'

import { motion } from 'framer-motion'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

interface DonutChartProps {
  data: { category: string; amount: number; color: string }[]
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

// SVG fill does not resolve var() references, so the palette hex mirrors the
// warm-dark tokens in globals.css. Keep in sync if the tokens change.
// Retuned for saturation without fluorescence against the new warm background.
const PALETTE = ['#C79A42', '#5AB48A', '#B55A3A', '#7A95AA', '#AC8858', '#8A7866']

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
              stroke="#1C1B18"
              isAnimationActive={false}
            >
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={PALETTE[index % PALETTE.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => formatCurrency(Number(value))}
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
              borderBottom: '1px solid var(--color-border)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
              <div style={{
                width: '8px',
                height: '8px',
                backgroundColor: PALETTE[index % PALETTE.length],
                borderRadius: 'var(--radius-pill)',
                flexShrink: 0,
              }} />
              <span style={{
                fontSize: '13px',
                color: 'var(--color-text-mid)',
                fontFamily: 'var(--font-mono)',
                letterSpacing: '0.03em',
              }}>
                {item.category}
              </span>
            </div>
            <span style={{
              fontSize: '13px',
              color: 'var(--color-text)',
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
