/**
 * Shared query helpers for the watch API. Both /api/watch/status and
 * /api/watch/log read from Signal, SignalState, and Scan tables; the shaping
 * lives here so the route handlers stay thin.
 *
 * All Date values are serialized to ISO 8601 strings per the wire contract
 * in lib/types/vigilance.ts.
 */

import type { PrismaClient } from '@prisma/client'
import type {
  Scan,
  ScanStatus,
  ScanTrigger,
  Signal,
  SignalDomain,
  SignalSeverity,
  SignalState as SignalStateLabel,
  WatchLogEntry,
  WatchLogResponse,
  WatchStatus,
} from '@/lib/types/vigilance'

// Cron fires at 06:00, 11:00, 15:00, 21:00 UTC. Kept in sync with vercel.json.
const SCHEDULED_SCAN_HOURS_UTC = [6, 11, 15, 21] as const

// v1 threshold: annual value must grow by more than this to emit a
// signal_widened entry. Tuned against current gap magnitudes (cents-to-
// dollars of churn shouldn't notify).
const WIDENING_DELTA_THRESHOLD = 100

export function computeNextScheduledScan(now: Date): string {
  const nowMs = now.getTime()
  for (let dayOffset = 0; dayOffset <= 1; dayOffset++) {
    for (const hour of SCHEDULED_SCAN_HOURS_UTC) {
      const candidate = new Date(
        Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth(),
          now.getUTCDate() + dayOffset,
          hour,
          0,
          0,
          0,
        ),
      )
      if (candidate.getTime() > nowMs) return candidate.toISOString()
    }
  }
  // Unreachable: the 8 slots across today + tomorrow always yield one > now.
  throw new Error('computeNextScheduledScan: no candidate slot found')
}

export function encodeCursor(date: Date): string {
  return Buffer.from(date.toISOString(), 'utf8').toString('base64url')
}

export function decodeCursor(cursor: string | null): Date | null {
  if (!cursor) return null
  try {
    const iso = Buffer.from(cursor, 'base64url').toString('utf8')
    if (!iso) return null
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return null
    return d
  } catch {
    return null
  }
}

type SignalRow = {
  id: string
  gapId: string
  domain: string
  state: string
  severity: string
  annualValue: number
  lifetimeValue: number | null
  payload: unknown
  firstDetectedAt: Date
  lastSeenAt: Date
  acknowledgedAt: Date | null
  actedAt: Date | null
  resolvedAt: Date | null
}

type ScanRow = {
  id: string
  startedAt: Date
  completedAt: Date | null
  status: string
  trigger: string
  signalsChecked: number
  signalsFlagged: number
  signalsResolved: number
  errorMessage: string | null
}

function toSignalWire(row: SignalRow): Signal {
  return {
    id: row.id,
    gapId: row.gapId,
    domain: row.domain as SignalDomain,
    state: row.state as SignalStateLabel,
    severity: row.severity as SignalSeverity,
    annualValue: row.annualValue,
    lifetimeValue: row.lifetimeValue,
    payload:
      row.payload && typeof row.payload === 'object'
        ? (row.payload as Record<string, unknown>)
        : null,
    firstDetectedAt: row.firstDetectedAt.toISOString(),
    lastSeenAt: row.lastSeenAt.toISOString(),
    acknowledgedAt: row.acknowledgedAt?.toISOString() ?? null,
    actedAt: row.actedAt?.toISOString() ?? null,
    resolvedAt: row.resolvedAt?.toISOString() ?? null,
  }
}

function toScanWire(row: ScanRow): Scan {
  return {
    id: row.id,
    startedAt: row.startedAt.toISOString(),
    completedAt: row.completedAt?.toISOString() ?? null,
    status: row.status as ScanStatus,
    trigger: row.trigger as ScanTrigger,
    signalsChecked: row.signalsChecked,
    signalsFlagged: row.signalsFlagged,
    signalsResolved: row.signalsResolved,
    errorMessage: row.errorMessage,
  }
}

export async function getWatchStatus(
  prisma: PrismaClient,
  userId: string,
): Promise<WatchStatus> {
  const [user, firstScan, latestScan, monitoredCount, activeSignals] =
    await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { createdAt: true },
      }),
      prisma.scan.findFirst({
        where: { userId },
        orderBy: { startedAt: 'asc' },
        select: { startedAt: true },
      }),
      prisma.scan.findFirst({
        where: { userId },
        orderBy: { startedAt: 'desc' },
        select: { startedAt: true, completedAt: true },
      }),
      prisma.signalState.count({ where: { userId } }),
      prisma.signal.findMany({
        where: {
          userId,
          state: { in: ['new', 'active', 'acknowledged'] },
        },
        select: { state: true, severity: true },
      }),
    ])

  const signalsActive = activeSignals.length
  const signalsNew = activeSignals.filter(s => s.state === 'new').length

  // Perimeter integrity (v1): start at 100, subtract 10 per active/flagged
  // signal and 20 per urgent, clamped to [0, 100]. Likely to be revised once
  // per-domain weighting lands.
  let integrity = 100
  for (const s of activeSignals) {
    if (s.severity === 'urgent') integrity -= 20
    else integrity -= 10
  }
  if (integrity < 0) integrity = 0
  if (integrity > 100) integrity = 100

  // onWatchSince prefers the first-ever scan. Fresh users (no scans yet)
  // fall back to signup time so the wire field stays a valid ISO string;
  // the UI's fresh-user state is driven by signalsMonitored === 0.
  const onWatchSinceIso = firstScan
    ? firstScan.startedAt.toISOString()
    : (user?.createdAt ?? new Date()).toISOString()

  return {
    onWatchSince: onWatchSinceIso,
    lastScanAt: latestScan?.startedAt.toISOString() ?? null,
    lastScanCompletedAt: latestScan?.completedAt?.toISOString() ?? null,
    signalsMonitored: monitoredCount,
    signalsActive,
    signalsNew,
    nextScheduledScanAt: computeNextScheduledScan(new Date()),
    perimeterIntegrity: integrity,
  }
}

export async function getWatchLog(
  prisma: PrismaClient,
  userId: string,
  options: { limit: number; cursor: Date | null },
): Promise<WatchLogResponse> {
  const limit = Math.max(1, Math.min(50, options.limit))
  // Treat cursors in the future or malformed dates (already null from decode)
  // as no cursor — client gets the most-recent page.
  const effectiveCursor =
    options.cursor && options.cursor.getTime() <= Date.now()
      ? options.cursor
      : null

  // Over-fetch signals so merging with scans + expanding each signal into
  // up to three events still yields enough rows to fill the page and detect
  // hasMore.
  const signalWhere = effectiveCursor
    ? { userId, lastSeenAt: { lt: effectiveCursor } }
    : { userId }

  const scanWhere = effectiveCursor
    ? {
        userId,
        completedAt: { lt: effectiveCursor, not: null } as {
          lt: Date
          not: null
        },
      }
    : { userId, completedAt: { not: null } as { not: null } }

  const [signalRows, scanRows, signalStateRows] = await Promise.all([
    prisma.signal.findMany({
      where: signalWhere,
      orderBy: { lastSeenAt: 'desc' },
      take: limit * 2,
    }),
    prisma.scan.findMany({
      where: scanWhere,
      orderBy: { completedAt: 'desc' },
      take: limit + 1,
    }),
    // SignalState.previousValue is the best v1 proxy for signal_widened
    // detection. Once per-scan annualValue history is persisted, widening
    // detection will move there and this read can be removed.
    prisma.signalState.findMany({
      where: { userId },
      select: { gapId: true, previousValue: true },
    }),
  ])

  const previousValueByGap = new Map<string, number | null>()
  for (const s of signalStateRows) {
    previousValueByGap.set(s.gapId, s.previousValue)
  }

  const entries: WatchLogEntry[] = []

  for (const row of signalRows) {
    const signal = toSignalWire(row)

    if (
      (!effectiveCursor || row.firstDetectedAt < effectiveCursor) &&
      row.state !== 'resolved'
    ) {
      entries.push({
        type: 'signal_new',
        timestamp: row.firstDetectedAt.toISOString(),
        signal,
      })
    }

    if (
      row.resolvedAt &&
      (!effectiveCursor || row.resolvedAt < effectiveCursor)
    ) {
      entries.push({
        type: 'signal_resolved',
        timestamp: row.resolvedAt.toISOString(),
        signal,
      })
    }

    // v1 widening detection. Known limitation: uses SignalState.previousValue
    // (the value from the prior scan only), so multi-scan growth collapses
    // and some transitions will be missed or misattributed until per-scan
    // history lands.
    const prev = previousValueByGap.get(row.gapId)
    if (
      row.lastSeenAt > row.firstDetectedAt &&
      prev !== undefined &&
      prev !== null &&
      row.annualValue - prev > WIDENING_DELTA_THRESHOLD &&
      (!effectiveCursor || row.lastSeenAt < effectiveCursor)
    ) {
      entries.push({
        type: 'signal_widened',
        timestamp: row.lastSeenAt.toISOString(),
        signal,
        deltaAnnualValue: row.annualValue - prev,
      })
    }
  }

  for (const row of scanRows) {
    if (!row.completedAt) continue
    entries.push({
      type: 'scan_completed',
      timestamp: row.completedAt.toISOString(),
      scan: toScanWire(row),
    })
  }

  entries.sort((a, b) =>
    a.timestamp < b.timestamp ? 1 : a.timestamp > b.timestamp ? -1 : 0,
  )

  const hasMore = entries.length > limit
  const trimmed = entries.slice(0, limit)
  const last = trimmed[trimmed.length - 1]
  const nextCursor =
    hasMore && last ? encodeCursor(new Date(last.timestamp)) : null

  return {
    entries: trimmed,
    hasMore,
    nextCursor,
  }
}
