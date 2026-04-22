/**
 * GET /api/watch/status — summary for the inscription strip. Always scoped
 * to the authenticated user's own data; userId never comes from the client.
 */

import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getWatchStatus } from '@/lib/vigilance/watchQueries'
import type { WatchStatus } from '@/lib/types/vigilance'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error

  const status: WatchStatus = await getWatchStatus(prisma, auth.user.dbUser.id)

  return NextResponse.json(status, {
    headers: { 'Cache-Control': 'private, max-age=30' },
  })
}
