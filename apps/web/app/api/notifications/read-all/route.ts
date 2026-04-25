/**
 * POST /api/notifications/read-all — marks every unread, non-dismissed
 * notification for the authenticated user as read.
 */

import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST() {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error

  const result = await prisma.notification.updateMany({
    where: {
      userId: auth.user.dbUser.id,
      readAt: null,
      dismissedAt: null,
    },
    data: { readAt: new Date() },
  })

  return NextResponse.json({ success: true, updatedCount: result.count })
}
