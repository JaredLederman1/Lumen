/**
 * Perimeter response derivation for /api/watch/perimeter.
 *
 * Reads active Signal rows + the user's liquid cash position. Signal positions
 * on the SVG are derived deterministically by the component from gapId via
 * perimeterMath.getSignalAngle, so this helper does not need to compute or
 * persist geometry.
 */

import type { PrismaClient } from '@prisma/client'
import type {
  Signal,
  SignalDomain,
  SignalSeverity,
  SignalState as SignalStateLabel,
} from '@/lib/types/vigilance'

export interface PerimeterResponse {
  cashAmount: number
  signals: Signal[]
}

const LIQUID_ACCOUNT_TYPES = new Set([
  'checking',
  'savings',
  'money market',
  'cd',
])

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

export async function getPerimeterResponse(
  prisma: PrismaClient,
  userId: string,
): Promise<PerimeterResponse> {
  const [signalRows, accounts] = await Promise.all([
    prisma.signal.findMany({
      where: {
        userId,
        state: { in: ['new', 'active', 'acknowledged'] },
      },
      orderBy: { lastSeenAt: 'desc' },
    }),
    prisma.account.findMany({
      where: { userId, classification: 'asset' },
      select: { accountType: true, balance: true },
    }),
  ])

  let cashAmount = 0
  for (const a of accounts) {
    if (LIQUID_ACCOUNT_TYPES.has(a.accountType.toLowerCase())) {
      cashAmount += a.balance
    }
  }

  return {
    cashAmount: Math.round(cashAmount),
    signals: signalRows.map(toSignalWire),
  }
}
