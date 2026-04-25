'use client'

import { motion } from 'framer-motion'
import BarChart from '@/components/ui/BarChart'
import { useCashflowQuery } from '@/lib/queries'
import WidgetCard from './WidgetCard'
import WidgetSkeleton, { WIDGET_REVEAL } from './WidgetSkeleton'

export default function CashFlowWidget() {
  const { data, isPending } = useCashflowQuery()
  if (isPending) return <WidgetSkeleton variant="chart" />
  const monthlyData = data?.months ?? []
  return (
    <motion.div {...WIDGET_REVEAL}>
      <WidgetCard
        variant="chart"
        eyebrow="Cash flow"
        caption="income vs expenses, last 6 months"
      >
        <BarChart data={monthlyData} />
      </WidgetCard>
    </motion.div>
  )
}
