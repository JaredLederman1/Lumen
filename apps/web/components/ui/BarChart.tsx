'use client'

import { motion } from 'framer-motion'
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

// SVG fill and stroke attributes do not resolve var() references, so the
// hex values below mirror the warm-dark palette in globals.css. Keep in sync
// if those tokens change.

interface BarChartProps {
  data: { month: string; income: number; expenses: number; savings: number }[]
}

function formatK(value: number) {
  return `$${(value / 1000).toFixed(0)}k`
}

export default function BarChart({ data }: BarChartProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut', delay: 0.15 }}
    >
      <ResponsiveContainer width="100%" height={200}>
        <RechartsBarChart data={data} barGap={4} barCategoryGap="30%" margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(247,230,193,0.08)" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fill: '#847B68', fontSize: 10, fontFamily: 'var(--font-mono)' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={formatK}
            tick={{ fill: '#847B68', fontSize: 10, fontFamily: 'var(--font-mono)' }}
            axisLine={false}
            tickLine={false}
            width={36}
          />
          <Tooltip
            formatter={(value, name) => [`$${Number(value).toLocaleString()}`, String(name).charAt(0).toUpperCase() + String(name).slice(1)]}
            contentStyle={{
              backgroundColor: 'var(--color-surface-elevated)',
              border: '1px solid var(--color-border-strong)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--color-text)',
              fontFamily: 'var(--font-mono)',
              fontSize: '13px',
              boxShadow: '0 4px 16px rgba(0,0,0,0.40)',
            }}
            cursor={{ fill: 'rgba(199,154,66,0.08)' }}
          />
          <Legend wrapperStyle={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }} />
          <Bar dataKey="income"   fill="#5AB48A" radius={[6, 6, 0, 0]} isAnimationActive={false} />
          <Bar dataKey="expenses" fill="#E8705F" radius={[6, 6, 0, 0]} isAnimationActive={false} />
        </RechartsBarChart>
      </ResponsiveContainer>
    </motion.div>
  )
}
