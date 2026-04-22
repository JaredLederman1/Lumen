/**
 * Per-gap stability streak logic.
 *
 * Unlike Signal rows (which only exist when a gap is currently flagged),
 * SignalState rows exist for every gap being monitored — including quiet
 * ones. They power "STABLE 39d" / "WIDENING 6d" badges in the UI.
 *
 * State machine over (previous currentState, isFlaggedNow, value delta):
 *   not flagged, was stable        → stable (no state change)
 *   not flagged, was flagged       → resolved_recent
 *   flagged, was not flagged       → flagged (new flag)
 *   flagged, value worsened        → widening
 *   flagged, value improved        → narrowing
 *   flagged, value ~unchanged (±2%) → flagged (unchanged)
 *
 * When the derived state equals the current one, we only update
 * lastCheckedAt and lastValue. When it changes, we also roll previousState,
 * stateSince, and previousValue.
 */

import type { Prisma, PrismaClient } from '@prisma/client'
import type { StabilityState } from '@/lib/types/vigilance'

type PrismaExecutor = PrismaClient | Prisma.TransactionClient

const UNCHANGED_TOLERANCE = 0.02 // 2%

function deriveNextState(
  previous: StabilityState,
  isFlagged: boolean,
  previousValue: number | null,
  currentValue: number,
): StabilityState {
  if (!isFlagged) {
    const wasFlaggedFamily =
      previous === 'flagged' || previous === 'widening' || previous === 'narrowing'
    if (wasFlaggedFamily) return 'resolved_recent'
    // stable or resolved_recent while not flagged — stay stable.
    return 'stable'
  }

  const wasFlagged =
    previous === 'flagged' || previous === 'widening' || previous === 'narrowing'

  if (!wasFlagged) return 'flagged'

  if (previousValue == null) return 'flagged'

  const base = Math.max(Math.abs(previousValue), 1)
  const delta = currentValue - previousValue
  const pct = Math.abs(delta) / base

  if (pct <= UNCHANGED_TOLERANCE) return 'flagged'
  // For gap values, a larger number = worse (more money left on the table /
  // more interest being paid). Widening = growing, narrowing = shrinking.
  return delta > 0 ? 'widening' : 'narrowing'
}

export interface UpdateStabilityResult {
  gapId: string
  previousState: StabilityState | null
  currentState: StabilityState
  stateChanged: boolean
}

export async function updateStabilityState(
  client: PrismaExecutor,
  userId: string,
  gapId: string,
  currentValue: number,
  isFlagged: boolean,
  now: Date,
): Promise<UpdateStabilityResult> {
  const existing = await client.signalState.findUnique({
    where: { userId_gapId: { userId, gapId } },
  })

  if (!existing) {
    const initialState: StabilityState = isFlagged ? 'flagged' : 'stable'
    await client.signalState.create({
      data: {
        userId,
        gapId,
        currentState: initialState,
        stateSince: now,
        previousState: null,
        lastCheckedAt: now,
        lastValue: currentValue,
        previousValue: null,
      },
    })
    return {
      gapId,
      previousState: null,
      currentState: initialState,
      stateChanged: true,
    }
  }

  const prev = existing.currentState as StabilityState
  const next = deriveNextState(prev, isFlagged, existing.lastValue, currentValue)

  if (next === prev) {
    await client.signalState.update({
      where: { id: existing.id },
      data: { lastCheckedAt: now, lastValue: currentValue },
    })
    return { gapId, previousState: prev, currentState: next, stateChanged: false }
  }

  await client.signalState.update({
    where: { id: existing.id },
    data: {
      previousState: prev,
      currentState: next,
      stateSince: now,
      lastCheckedAt: now,
      previousValue: existing.lastValue,
      lastValue: currentValue,
    },
  })
  return { gapId, previousState: prev, currentState: next, stateChanged: true }
}
