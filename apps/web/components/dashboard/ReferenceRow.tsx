'use client'

import { motion } from 'framer-motion'
import type { PriorityMetrics } from '@/lib/dashboardState'
import { REFERENCE_ROW, type WidgetId } from './widgetIds'
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
  exclude: Set<WidgetId>
  metrics: PriorityMetrics
}

export default function ReferenceRow({ exclude, metrics }: Props) {
  const ids = REFERENCE_ROW.filter(id => !exclude.has(id))
  if (ids.length === 0) return null
  const raw = ids.map(id => getWidgetSize(id, 'reference'))
  const { desktop, tablet } = computeRowLayout(raw)
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut', delay: 0.24 }}
      className={`${GRID_ROW_CLASS} dashboard-reference-row`}
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
