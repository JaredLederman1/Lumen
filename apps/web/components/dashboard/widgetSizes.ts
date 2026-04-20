/**
 * Per-widget grid footprint for the dashboard's unified 6-column bento layout.
 *
 * Desktop uses a `repeat(6, 1fr)` grid with `grid-auto-rows: minmax(260px,
 * auto)`, so widgets declare their own `colSpan` (1..6) and `rowSpan` (1 or 2)
 * here and the row components just map each ID through this registry.
 *
 * The tablet breakpoint (769-1024px) collapses to 4 columns via a CSS rule on
 * `.dashboard-grid-row[data-grid="tablet"]` in globals.css. That rule adjusts
 * the `--col-span` fallback for the spans that don't make sense at 4 cols:
 *   - span 3 -> span 2
 *   - span 6 -> span 4
 *   - spans 2, 4 unchanged
 */
import type { WidgetId } from './widgetIds'

export interface WidgetSize {
  colSpan: number
  rowSpan: number
}

/**
 * Widget sizes keyed by row context. A handful of widgets (cash-flow)
 * legitimately sit in both Priority and Context rows and want different
 * footprints depending on which row picked them up. The generic per-ID
 * fallback below handles widgets that only appear in one row.
 */
export type RowContext = 'priority' | 'context' | 'reference'

const PRIORITY_SIZES: Partial<Record<WidgetId, WidgetSize>> = {
  'debt-trajectory':          { colSpan: 2, rowSpan: 1 },
  'opportunity-cost':         { colSpan: 2, rowSpan: 1 },
  'spending-donut':           { colSpan: 2, rowSpan: 1 },
  'emergency-fund-gauge':     { colSpan: 2, rowSpan: 1 },
  'match-setup':              { colSpan: 2, rowSpan: 1 },
  'match-gap':                { colSpan: 2, rowSpan: 1 },
  'tax-advantaged-capacity':  { colSpan: 2, rowSpan: 1 },
  'portfolio':                { colSpan: 2, rowSpan: 1 },
  'category-concentration':   { colSpan: 2, rowSpan: 1 },
  'wealth-trajectory':        { colSpan: 2, rowSpan: 1 },
  'advanced-strategies':      { colSpan: 2, rowSpan: 1 },
  'link-asset-account':       { colSpan: 2, rowSpan: 1 },
  'cash-flow':                { colSpan: 2, rowSpan: 1 },
  'net-worth-chart':          { colSpan: 2, rowSpan: 1 },
  'recurring-charges':        { colSpan: 2, rowSpan: 1 },
}

const CONTEXT_SIZES: Partial<Record<WidgetId, WidgetSize>> = {
  'recent-transactions':      { colSpan: 3, rowSpan: 2 },
  'goals-progress':           { colSpan: 3, rowSpan: 1 },
  'cash-flow':                { colSpan: 3, rowSpan: 1 },
  'health-score':             { colSpan: 3, rowSpan: 1 },
}

const REFERENCE_SIZES: Partial<Record<WidgetId, WidgetSize>> = {
  'net-worth-chart':          { colSpan: 4, rowSpan: 1 },
  'account-balances':         { colSpan: 2, rowSpan: 1 },
}

const DEFAULT_SIZE: WidgetSize = { colSpan: 2, rowSpan: 1 }

export function getWidgetSize(id: WidgetId, context: RowContext): WidgetSize {
  const table =
    context === 'priority'
      ? PRIORITY_SIZES
      : context === 'context'
        ? CONTEXT_SIZES
        : REFERENCE_SIZES
  return table[id] ?? DEFAULT_SIZE
}
