/**
 * GET /api/watch/thresholds — feeds the threshold composite gauges. Derives
 * raw display metrics (yield %, subscription $/mo, dining drift %, debt
 * utilization %) from accounts and recent transactions. Always scoped to the
 * authenticated user; userId never comes from the client.
 */

import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getThresholdsResponse } from '@/lib/vigilance/thresholdDerivation'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error

  const data = await getThresholdsResponse(prisma, auth.user.dbUser.id)

  return NextResponse.json(data, {
    headers: { 'Cache-Control': 'private, max-age=60' },
  })
}
