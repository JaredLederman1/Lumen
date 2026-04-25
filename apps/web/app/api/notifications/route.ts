/**
 * GET /api/notifications — paginated notification feed for the authenticated
 * user. Excludes dismissed rows. Cursor is the createdAt ISO timestamp of the
 * last row in the previous page.
 */

import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const DEFAULT_LIMIT = 20
const MAX_LIMIT = 50

export async function GET(request: Request) {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error

  const userId = auth.user.dbUser.id
  const url = new URL(request.url)

  const limitRaw = url.searchParams.get('limit')
  let limit = DEFAULT_LIMIT
  if (limitRaw) {
    const parsed = Number.parseInt(limitRaw, 10)
    if (Number.isFinite(parsed) && parsed > 0) {
      limit = Math.min(MAX_LIMIT, parsed)
    }
  }

  const cursorRaw = url.searchParams.get('cursor')
  let cursorDate: Date | null = null
  if (cursorRaw) {
    const parsed = new Date(cursorRaw)
    if (!Number.isNaN(parsed.getTime())) cursorDate = parsed
  }

  const filterRaw = url.searchParams.get('filter')
  const filter: 'unread' | 'all' = filterRaw === 'unread' ? 'unread' : 'all'

  const where: {
    userId: string
    dismissedAt: null
    readAt?: null
    createdAt?: { lt: Date }
  } = {
    userId,
    dismissedAt: null,
  }
  if (filter === 'unread') where.readAt = null
  if (cursorDate) where.createdAt = { lt: cursorDate }

  const rows = await prisma.notification.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
    select: {
      id: true,
      signalId: true,
      kind: true,
      domain: true,
      dollarImpact: true,
      title: true,
      body: true,
      readAt: true,
      dismissedAt: true,
      createdAt: true,
    },
  })

  const hasMore = rows.length > limit
  const page = hasMore ? rows.slice(0, limit) : rows
  const nextCursor = hasMore
    ? page[page.length - 1].createdAt.toISOString()
    : null

  const unreadCount = await prisma.notification.count({
    where: { userId, dismissedAt: null, readAt: null },
  })

  return NextResponse.json(
    {
      notifications: page.map(n => ({
        id: n.id,
        signalId: n.signalId,
        kind: n.kind,
        domain: n.domain,
        dollarImpact: n.dollarImpact,
        title: n.title,
        body: n.body,
        readAt: n.readAt ? n.readAt.toISOString() : null,
        dismissedAt: n.dismissedAt ? n.dismissedAt.toISOString() : null,
        createdAt: n.createdAt.toISOString(),
      })),
      nextCursor,
      unreadCount,
    },
    {
      headers: { 'Cache-Control': 'private, max-age=10' },
    },
  )
}
