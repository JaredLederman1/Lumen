/**
 * POST /api/notifications/[id]/dismiss — sets dismissedAt so the row drops
 * out of the feed. Idempotent.
 */

import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error

  const { id } = await params
  const userId = auth.user.dbUser.id

  const existing = await prisma.notification.findFirst({
    where: { id, userId },
    select: { id: true, dismissedAt: true },
  })
  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (!existing.dismissedAt) {
    await prisma.notification.update({
      where: { id: existing.id },
      data: { dismissedAt: new Date() },
    })
  }

  return NextResponse.json({ success: true })
}
