/**
 * Stable identifiers for every widget Illumin can render in the dashboard
 * grid. Used for cross-row deduplication — if a widget appears in Priority,
 * the same ID must be excluded from Context and Reference.
 */
export type WidgetId =
  | 'net-worth-chart'
  | 'spending-donut'
  | 'cash-flow'
  | 'recurring-charges'
  | 'opportunity-cost'
  | 'portfolio'
  | 'recent-transactions'
  | 'goals-progress'
  | 'recovery'
  | 'account-balances'
  | 'debt-trajectory'
  | 'emergency-fund-gauge'
  | 'match-setup'
  | 'match-gap'
  | 'tax-advantaged-capacity'
  | 'category-concentration'
  | 'wealth-trajectory'
  | 'advanced-strategies'
  | 'link-asset-account'

import type { DashboardState } from '@/lib/dashboardState'

/**
 * Priority Row lineup per state. Phase 1 spec maps a 3-widget slate to each
 * state. PRE_LINK hides the row entirely.
 */
export const PRIORITY_ROW: Record<DashboardState, WidgetId[]> = {
  PRE_LINK: [],
  LIABILITY_ONLY: ['debt-trajectory', 'recurring-charges', 'link-asset-account'],
  DEBT_DOMINANT: ['debt-trajectory', 'opportunity-cost', 'spending-donut'],
  FOUNDATION: ['emergency-fund-gauge', 'match-setup', 'cash-flow'],
  MATCH_GAP: ['match-gap', 'opportunity-cost', 'net-worth-chart'],
  OPTIMIZING: ['tax-advantaged-capacity', 'opportunity-cost', 'portfolio'],
  SPENDING_LEAK: ['category-concentration', 'spending-donut', 'opportunity-cost'],
  OPTIMIZED: ['wealth-trajectory', 'advanced-strategies', 'net-worth-chart'],
}

/**
 * Context Row is the same widget set for every state. Deduplication happens
 * at the render layer.
 *
 * `recovery` is rendered in the dedicated Recovery + Accounts row on the
 * dashboard page itself, so it's excluded here to avoid double rendering.
 */
export const CONTEXT_ROW: WidgetId[] = [
  'recent-transactions',
  'goals-progress',
  'cash-flow',
]

/**
 * Reference Row is the same widget set for every state. Deduplication happens
 * at the render layer.
 *
 * `net-worth-chart` and `account-balances` are rendered in dedicated rows at
 * the top of the dashboard (alongside Sentinel) and below the main grid, so
 * they're excluded from this generic row.
 */
export const REFERENCE_ROW: WidgetId[] = []
