/**
 * Signal lifecycle: create / refresh / re-surface / resolve Signal rows as
 * the scan runner reports each detected gap.
 *
 * All state transitions funnel through upsertSignal (per-gap) and
 * resolveMissingSignals (sweep at end of scan). Severity is derived from
 * annualValue here so that every write goes through the same rule.
 */

import type { Prisma, PrismaClient } from '@prisma/client'
import type { DetectedGap } from '@/lib/recovery'
import type { SignalDomain, SignalSeverity, SignalState } from '@/lib/types/vigilance'

export interface UpsertSignalResult {
  signalId: string
  wasNew: boolean
  wasUpdated: boolean
}

type PrismaExecutor = PrismaClient | Prisma.TransactionClient

/**
 * Derive severity from annual value. v1 heuristic — may become per-domain in
 * future. The `domain` parameter is accepted now so callers don't need to
 * change when the rule diverges by domain.
 */
export function computeSeverity(
  annualValue: number,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _domain: SignalDomain,
): SignalSeverity {
  if (annualValue >= 2000) return 'urgent'
  if (annualValue >= 500) return 'flagged'
  return 'advisory'
}

/**
 * Insert a new signal or update the existing one for (userId, gapId).
 *
 * State machine:
 *   - no existing row           → insert with state = 'new'
 *   - existing new/active/ack'd → refresh lastSeen + values (keep firstDetectedAt)
 *   - existing resolved/stale   → re-surface: state = 'new', reset firstDetectedAt
 *   - existing acted            → refresh values but preserve state (user took action;
 *                                 don't clobber that signal until it's explicitly
 *                                 resolved or re-surfaced)
 */
export async function upsertSignal(
  client: PrismaExecutor,
  userId: string,
  gap: DetectedGap,
  scanId: string,
  now: Date,
): Promise<UpsertSignalResult> {
  const severity = computeSeverity(gap.annualValue, gap.domain)
  const payload = gap.payload as Prisma.InputJsonValue

  const existing = await client.signal.findUnique({
    where: { userId_gapId: { userId, gapId: gap.gapId } },
  })

  if (!existing) {
    const created = await client.signal.create({
      data: {
        userId,
        gapId: gap.gapId,
        domain: gap.domain,
        state: 'new' satisfies SignalState,
        severity,
        annualValue: gap.annualValue,
        lifetimeValue: gap.lifetimeValue,
        payload,
        firstDetectedAt: now,
        lastSeenAt: now,
        firstDetectedInScanId: scanId,
        lastUpdatedInScanId: scanId,
      },
    })
    return { signalId: created.id, wasNew: true, wasUpdated: false }
  }

  const prevState = existing.state as SignalState
  const isDormant = prevState === 'resolved' || prevState === 'stale'

  if (isDormant) {
    const updated = await client.signal.update({
      where: { id: existing.id },
      data: {
        state: 'new' satisfies SignalState,
        severity,
        annualValue: gap.annualValue,
        lifetimeValue: gap.lifetimeValue,
        payload,
        firstDetectedAt: now,
        lastSeenAt: now,
        resolvedAt: null,
        lastUpdatedInScanId: scanId,
      },
    })
    return { signalId: updated.id, wasNew: false, wasUpdated: true }
  }

  // Active / new / acknowledged / acted — refresh in place, preserve firstDetectedAt.
  const updated = await client.signal.update({
    where: { id: existing.id },
    data: {
      severity,
      annualValue: gap.annualValue,
      lifetimeValue: gap.lifetimeValue,
      payload,
      lastSeenAt: now,
      lastUpdatedInScanId: scanId,
    },
  })
  return { signalId: updated.id, wasNew: false, wasUpdated: true }
}

/**
 * Transition any signal currently in new/active/acknowledged/acted whose
 * gapId is not in the detected set to state = 'resolved'. Called once at the
 * end of the scan.
 */
export async function resolveMissingSignals(
  client: PrismaExecutor,
  userId: string,
  detectedGapIds: Set<string>,
  now: Date,
): Promise<number> {
  const openSignals = await client.signal.findMany({
    where: {
      userId,
      state: { in: ['new', 'active', 'acknowledged', 'acted'] },
    },
    select: { id: true, gapId: true },
  })

  const toResolve = openSignals.filter(s => !detectedGapIds.has(s.gapId))
  if (toResolve.length === 0) return 0

  await client.signal.updateMany({
    where: { id: { in: toResolve.map(s => s.id) } },
    data: {
      state: 'resolved' satisfies SignalState,
      resolvedAt: now,
    },
  })
  return toResolve.length
}
