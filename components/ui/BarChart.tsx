'use client'

import { motion } from 'framer-motion'
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

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
        <RechartsBarChart data={data} barGap={4} barCategoryGap="30%">
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(184,145,58,0.12)" vertical={false} />
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
            width={36}
          />
          <Tooltip
            formatter={(value, name) => [`$${Number(value).toLocaleString()}`, String(name).charAt(0).toUpperCase() + String(name).slice(1)]}
            contentStyle={{
              backgroundColor: '#FFFFFF',
              border: '1px solid rgba(184,145,58,0.25)',
              borderRadius: '2px',
              color: '#1A1714',
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
            }}
            cursor={{ fill: 'rgba(184,145,58,0.04)' }}
          />
          <Legend wrapperStyle={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: '#A89880' }} />
          <Bar dataKey="income"   fill="#2D6A4F" radius={[2, 2, 0, 0]} />
          <Bar dataKey="expenses" fill="#8B4513" radius={[2, 2, 0, 0]} />
        </RechartsBarChart>
      </ResponsiveContainer>
    </motion.div>
  )
}
