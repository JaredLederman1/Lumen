'use client'

import { motion } from 'framer-motion'
import type { DashboardState, PriorityMetrics } from '@/lib/dashboardState'
import { PRIORITY_ROW, type WidgetId } from './widgetIds'
import { renderWidget } from './widgetRegistry'
import { getWidgetSize } from './widgetSizes'
import {
  GRID_CELL_CLASS,
  GRID_ROW_CLASS,
  GRID_ROW_STYLE,
  computeRowLayout,
  gridCellStyle,
} from './gridCell'

interface Props {
  state: DashboardState
  metrics: PriorityMetrics
}

export default function PriorityRow({ state, metrics }: Props) {
  const ids: WidgetId[] = PRIORITY_ROW[state]
  if (ids.length === 0) return null
  const raw = ids.map(id => getWidgetSize(id, 'priority'))
  const { desktop, tablet } = computeRowLayout(raw)
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut', delay: 0.08 }}
      className={`${GRID_ROW_CLASS} dashboard-priority-row`}
      style={GRID_ROW_STYLE}
    >
      {ids.map((id, i) => (
        <div
          key={id}
          className={GRID_CELL_CLASS}
          style={gridCellStyle(desktop[i], tablet[i])}
        >
          {renderWidget(id, metrics)}
        </div>
      ))}
    </motion.section>
  )
}
