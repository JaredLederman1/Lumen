/**
 * Shared helpers for rendering dashboard grid cells. The three row components
 * (Priority / Context / Reference) all consume the same 6-column grid and
 * collapse to 4 columns at tablet width. Each cell publishes its colSpan and
 * rowSpan via CSS custom properties so globals.css can swap desktop and
 * tablet spans with a single media query instead of per-component React
 * logic.
 *
 * Row packing: after mapping widgets through the size registry we run
 * `packLastRow` so the final visible row of each breakpoint has no trailing
 * empty cells. The heuristic is sequential: count cells, compute the
 * remainder modulo the column count, and grow the last widget by that gap.
 * Health-score and net-worth-chart are natural "elastic" fits for this
 * because they are the last widget in their respective row lineups and their
 * content scales cleanly at wider footprints.
 */
import type { CSSProperties } from 'react'
import type { WidgetSize } from './widgetSizes'

const DESKTOP_COLS = 6
const TABLET_COLS = 4

/**
 * Tablet collapses the 6-col grid to 4 cols. A span of 3 no longer divides
 * evenly and wastes a column, so it drops to 2. A span of 6 still means full
 * width, so it drops to 4. Spans of 2 and 4 are unchanged.
 */
function tabletColSpan(colSpan: number): number {
  if (colSpan >= 6) return TABLET_COLS
  if (colSpan === 3) return 2
  if (colSpan === 5) return TABLET_COLS
  return Math.min(colSpan, TABLET_COLS)
}

function tabletSizeFor(size: WidgetSize): WidgetSize {
  return { colSpan: tabletColSpan(size.colSpan), rowSpan: size.rowSpan }
}

/**
 * If the total grid area (sum of colSpan * rowSpan) does not divide evenly
 * into the column count, expand the final widget so the last visible row is
 * full. We only grow widgets with rowSpan 1 because a taller widget's
 * position depends on preceding widgets and can't safely be widened without
 * re-simulating the grid auto-placement algorithm.
 */
function packLastRow(sizes: WidgetSize[], cols: number): WidgetSize[] {
  if (sizes.length === 0) return sizes
  const totalCells = sizes.reduce((s, sz) => s + sz.colSpan * sz.rowSpan, 0)
  const remainder = totalCells % cols
  if (remainder === 0) return sizes

  const gap = cols - remainder
  const last = sizes[sizes.length - 1]
  if (last.rowSpan !== 1) return sizes

  const nextColSpan = Math.min(cols, last.colSpan + gap)
  if (nextColSpan === last.colSpan) return sizes

  return [
    ...sizes.slice(0, -1),
    { ...last, colSpan: nextColSpan },
  ]
}

export interface RowLayout {
  desktop: WidgetSize[]
  tablet: WidgetSize[]
}

export function computeRowLayout(rawSizes: WidgetSize[]): RowLayout {
  const tabletRaw = rawSizes.map(tabletSizeFor)
  return {
    desktop: packLastRow(rawSizes, DESKTOP_COLS),
    tablet: packLastRow(tabletRaw, TABLET_COLS),
  }
}

export function gridCellStyle(desktop: WidgetSize, tablet: WidgetSize): CSSProperties {
  return {
    ['--col-span-desktop' as string]: desktop.colSpan,
    ['--col-span-tablet' as string]: tablet.colSpan,
    ['--row-span-desktop' as string]: desktop.rowSpan,
    ['--row-span-tablet' as string]: tablet.rowSpan,
  } as CSSProperties
}

export const GRID_ROW_CLASS = 'dashboard-grid-row'
export const GRID_CELL_CLASS = 'dashboard-grid-cell'

/**
 * Inline equivalent of the `.dashboard-grid-row` rule in globals.css. We apply
 * these as inline styles on each row as a safety net, since the className
 * alone is not always honored by the compiled stylesheet. The tablet and
 * mobile media queries in globals.css override this with !important.
 */
export const GRID_ROW_STYLE: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(6, 1fr)',
  gridAutoRows: 'minmax(260px, auto)',
  gap: '20px',
}
