/**
 * Internal scan endpoint. Called by the scheduler (cron) and by any
 * server-side path that wants to trigger a scan for a specific user
 * (post-sync hook, manual admin invocation, etc).
 *
 * Gated by x-internal-secret — never expose to the browser. Errors return
 * a generic "Unauthorized" so the header's absence vs mismatch are
 * indistinguishable.
 */

import { NextRequest, NextResponse } from 'next/server'
import { runScanForUser } from '@/lib/vigilance/scanRunner'
import type { ScanTrigger } from '@/lib/types/vigilance'

const VALID_TRIGGERS: ReadonlySet<ScanTrigger> = new Set<ScanTrigger>([
  'scheduled',
  'app_open',
  'manual',
  'post_sync',
])

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let mismatch = 0
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return mismatch === 0
}

export async function POST(request: NextRequest) {
  const expected = process.env.INTERNAL_SCAN_SECRET
  const provided = request.headers.get('x-internal-secret')

  if (!expected || !provided || !timingSafeEqual(provided, expected)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { userId, trigger } = body as { userId?: unknown; trigger?: unknown }

  if (typeof userId !== 'string' || userId.length === 0) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 })
  }
  if (typeof trigger !== 'string' || !VALID_TRIGGERS.has(trigger as ScanTrigger)) {
    return NextResponse.json(
      { error: 'trigger must be one of: scheduled, app_open, manual, post_sync' },
      { status: 400 },
    )
  }

  try {
    const result = await runScanForUser(userId, trigger as ScanTrigger)
    return NextResponse.json(result)
  } catch (err) {
    console.error('[internal/scan] runScanForUser failed:', err)
    const message = err instanceof Error ? err.message : 'Scan failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
