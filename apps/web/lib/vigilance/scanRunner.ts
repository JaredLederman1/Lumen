/**
 * Orchestrates one full vigilance scan for a single user.
 *
 * Flow:
 *   1. Open a Scan row (status='running').
 *   2. Sync Plaid (outside any DB transaction — network-bound, can be slow).
 *   3. Detect currently-flagged gaps via recovery.detectGaps.
 *   4. Upsert Signal rows for each detected gap (transactional batch).
 *   5. Resolve Signal rows that disappeared since the last scan.
 *   6. Update per-gap SignalState stability rows (including non-flagged gaps).
 *   7. Close the Scan row.
 *
 * Two concurrent scans for the same user: accepted as "last writer wins".
 * No distributed lock for v1 — the signals/stability writes are idempotent
 * on (userId, gapId) so duplicate scans produce consistent end state, just
 * with interleaved intermediate writes.
 */

import { prisma } from '@/lib/prisma'
import { syncPlaidForUser } from '@/lib/plaid/sync'
import { detectGaps, type DetectedGap } from '@/lib/recovery'
import {
  upsertSignal,
  resolveMissingSignals,
} from '@/lib/vigilance/signalLifecycle'
import { updateStabilityState } from '@/lib/vigilance/stabilityTracker'
import { crossCheckBenefits, type ExtractedBenefits } from '@/lib/benefitsAnalysis'
import type { ScanStatus, ScanTrigger } from '@/lib/types/vigilance'

export interface ScanResult {
  scanId: string
  status: Extract<ScanStatus, 'completed' | 'partial'>
  signalsChecked: number
  signalsNew: number
  signalsUpdated: number
  signalsResolved: number
  durationMs: number
}

const STATIC_MONITORED_GAP_IDS: readonly string[] = [
  'idle_cash:default',
  'hysa:default',
  'debt:high_apr',
  'match:401k',
]

function taxAdvantagedGapIds(now: Date): string[] {
  const year = now.getFullYear()
  return [
    `tax_advantaged:ira:${year}`,
    `tax_advantaged:hsa:${year}`,
  ]
}

/**
 * Build the master list of gapIds the stability tracker should evaluate.
 * Static entries + the year-scoped tax-advantaged ones + dynamic benefits:*
 * pulled from EmploymentBenefits.rawExtraction.
 */
async function buildMonitoredGapIds(userId: string, now: Date): Promise<string[]> {
  const benefits = await prisma.employmentBenefits.findUnique({ where: { userId } })
  const benefitIds: string[] = []
  if (benefits) {
    const extracted = (benefits.rawExtraction ?? null) as ExtractedBenefits | null
    if (extracted) {
      for (const item of crossCheckBenefits(extracted)) {
        if (!item.annualValue || item.annualValue <= 0) continue
        benefitIds.push(`benefits:${item.label}`)
      }
    }
  }
  return [
    ...STATIC_MONITORED_GAP_IDS,
    ...taxAdvantagedGapIds(now),
    ...benefitIds,
  ]
}

export async function runScanForUser(
  userId: string,
  trigger: ScanTrigger,
): Promise<ScanResult> {
  const startedAt = new Date()

  const scan = await prisma.scan.create({
    data: {
      userId,
      trigger,
      status: 'running',
      startedAt,
    },
  })

  // Step 2 — Plaid sync runs outside any DB transaction because it is
  // network-bound and can take seconds. Per-account errors are surfaced in
  // the result; we only degrade to status='partial' at the end.
  let hadSyncErrors = false
  try {
    const syncResult = await syncPlaidForUser(userId)
    if (syncResult.accountErrors.length > 0) hadSyncErrors = true
  } catch (err) {
    console.error('[scanRunner] Plaid sync threw; continuing with stale data', err)
    hadSyncErrors = true
  }

  // Step 3 — detect currently flagged gaps from post-sync data.
  const detected: DetectedGap[] = await detectGaps(userId, prisma)
  const detectedById = new Map(detected.map(g => [g.gapId, g]))
  const detectedIdSet = new Set(detectedById.keys())

  // Step 4-6 — signal + stability writes in a single transaction for
  // atomicity across the resolve sweep.
  const now = new Date()
  const monitoredGapIds = await buildMonitoredGapIds(userId, now)
  // Union with detected so ad-hoc new gapIds still get a stability row.
  const stabilityGapIds = new Set<string>([...monitoredGapIds, ...detectedIdSet])

  const { signalsNew, signalsUpdated, signalsResolved } = await prisma.$transaction(
    async tx => {
      let newCount = 0
      let updatedCount = 0

      for (const gap of detected) {
        const result = await upsertSignal(tx, userId, gap, scan.id, now)
        if (result.wasNew) newCount++
        else if (result.wasUpdated) updatedCount++
      }

      const resolvedCount = await resolveMissingSignals(tx, userId, detectedIdSet, now)

      for (const gapId of stabilityGapIds) {
        const gap = detectedById.get(gapId)
        const isFlagged = gap != null
        const currentValue = gap?.annualValue ?? 0
        await updateStabilityState(tx, userId, gapId, currentValue, isFlagged, now)
      }

      return {
        signalsNew: newCount,
        signalsUpdated: updatedCount,
        signalsResolved: resolvedCount,
      }
    },
  )

  const completedAt = new Date()
  const status: Extract<ScanStatus, 'completed' | 'partial'> = hadSyncErrors
    ? 'partial'
    : 'completed'

  // signalsChecked = every gapId evaluated this scan (monitored union detected).
  const signalsChecked = stabilityGapIds.size
  const signalsFlagged = detected.length

  await prisma.scan.update({
    where: { id: scan.id },
    data: {
      status,
      completedAt,
      signalsChecked,
      signalsFlagged,
      signalsResolved,
    },
  })

  return {
    scanId: scan.id,
    status,
    signalsChecked,
    signalsNew,
    signalsUpdated,
    signalsResolved,
    durationMs: completedAt.getTime() - startedAt.getTime(),
  }
}
