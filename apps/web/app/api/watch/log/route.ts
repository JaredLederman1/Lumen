/**
 * GET /api/watch/log — paginated merged feed of signal events and scan
 * completions. Reverse-chronological. Always scoped to the authenticated
 * user; userId never comes from the client.
 */

import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { decodeCursor, getWatchLog } from '@/lib/vigilance/watchQueries'
import type { WatchLogResponse } from '@/lib/types/vigilance'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const DEFAULT_LIMIT = 20
const MAX_LIMIT = 50

export async function GET(request: Request) {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error

  const url = new URL(request.url)
  const limitRaw = url.searchParams.get('limit')
  const cursorRaw = url.searchParams.get('cursor')

  let limit = DEFAULT_LIMIT
  if (limitRaw) {
    const parsed = Number.parseInt(limitRaw, 10)
    if (Number.isFinite(parsed) && parsed > 0) {
      limit = Math.min(MAX_LIMIT, parsed)
    }
  }

  const cursor = decodeCursor(cursorRaw)

  const result: WatchLogResponse = await getWatchLog(
    prisma,
    auth.user.dbUser.id,
    { limit, cursor },
  )

  return NextResponse.json(result, {
    headers: { 'Cache-Control': 'private, max-age=30' },
  })
}
