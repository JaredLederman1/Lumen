/**
 * Vercel Cron trigger. Scheduled in vercel.json to fire once daily at
 * 11:30 UTC (Hobby plan limit). Iterates users whose most recent scan is
 * missing or older than the cadence window and runs `runScanForUser` for
 * each with bounded concurrency.
 *
 * Auth: Vercel Cron sends "Authorization: Bearer <CRON_SECRET>". Any other
 * caller (missing header, wrong secret) gets a generic 401.
 */

import { NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { prisma } from '@/lib/prisma'
import {
  getUsersDueForScan,
  runScheduledScans,
} from '@/lib/vigilance/scanScheduler'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
// Room for concurrency=5 × perUserTimeoutMs=30s plus DB roundtrips. Raise
// further if user count grows past what fits in one invocation.
export const maxDuration = 300

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let mismatch = 0
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return mismatch === 0
}

export async function GET(request: Request) {
  Sentry.setTag('cron', 'scan-all')

  const secret = process.env.CRON_SECRET
  const authHeader = request.headers.get('authorization')
  const expectedHeader = secret ? `Bearer ${secret}` : null

  if (
    !expectedHeader ||
    !authHeader ||
    !timingSafeEqual(authHeader, expectedHeader)
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const start = Date.now()
  try {
    const userIds = await getUsersDueForScan(prisma, { maxAgeHours: 20 })
    const result = await runScheduledScans(userIds, {
      concurrency: 5,
      perUserTimeoutMs: 30_000,
    })

    const durationMs = Date.now() - start
    Sentry.addBreadcrumb({
      category: 'cron',
      message: 'scan_all_summary',
      level: result.failed > 0 ? 'warning' : 'info',
      data: {
        usersScanned: userIds.length,
        usersSucceeded: result.succeeded,
        usersFailed: result.failed,
        durationMs,
      },
    })

    return NextResponse.json({
      usersScanned: userIds.length,
      usersSucceeded: result.succeeded,
      usersFailed: result.failed,
      usersSkipped: 0,
      durationMs,
    })
  } catch (err) {
    Sentry.captureException(err, {
      tags: { component: 'cron_scan_all' },
    })
    console.error('[cron/scan-all] handler failed:', err)
    return NextResponse.json(
      { error: 'Scan batch failed' },
      { status: 500 },
    )
  }
}
