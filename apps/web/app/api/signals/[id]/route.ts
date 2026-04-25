/**
 * GET /api/signals/[id] — single Signal with its full SignalSnapshot history
 * and any related Notification rows. 404 when the signal does not exist or
 * does not belong to the authenticated user; userId never comes from the
 * client.
 */

import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type {
  Signal,
  SignalDetailResponse,
  SignalDomain,
  SignalNotificationWire,
  SignalSeverity,
  SignalSnapshotWire,
  SignalState as SignalStateLabel,
} from '@/lib/types/vigilance'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error

  const { id } = await context.params

  const row = await prisma.signal.findUnique({ where: { id } })
  if (!row || row.userId !== auth.user.dbUser.id) {
    return NextResponse.json({ error: 'Signal not found' }, { status: 404 })
  }

  const [snapshotRows, notificationRows] = await Promise.all([
    prisma.signalSnapshot.findMany({
      where: { userId: auth.user.dbUser.id, gapId: row.gapId },
      orderBy: { capturedAt: 'asc' },
    }),
    prisma.notification.findMany({
      where: { userId: auth.user.dbUser.id, signalId: id },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  const signal: Signal = {
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

  const snapshots: SignalSnapshotWire[] = snapshotRows.map(s => ({
    id: s.id,
    scanId: s.scanId,
    capturedAt: s.capturedAt.toISOString(),
    severity: s.severity as SignalSeverity,
    state: s.state as SignalStateLabel,
    annualValue: s.annualValue,
    lifetimeValue: s.lifetimeValue,
    payload:
      s.payload && typeof s.payload === 'object'
        ? (s.payload as Record<string, unknown>)
        : null,
  }))

  const notifications: SignalNotificationWire[] = notificationRows.map(n => ({
    id: n.id,
    kind: n.kind as 'new' | 'reopened' | 'worsened',
    title: n.title,
    body: n.body,
    dollarImpact: n.dollarImpact,
    readAt: n.readAt?.toISOString() ?? null,
    createdAt: n.createdAt.toISOString(),
  }))

  const body: SignalDetailResponse = { signal, snapshots, notifications }

  return NextResponse.json(body, {
    headers: { 'Cache-Control': 'private, max-age=30' },
  })
}
