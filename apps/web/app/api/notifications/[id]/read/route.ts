/**
 * POST /api/notifications/[id]/read — marks a single notification as read.
 * Idempotent: returns the existing readAt if already read.
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
    select: { id: true, readAt: true },
  })
  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (existing.readAt) {
    return NextResponse.json({
      success: true,
      notification: { id: existing.id, readAt: existing.readAt.toISOString() },
    })
  }

  const updated = await prisma.notification.update({
    where: { id: existing.id },
    data: { readAt: new Date() },
    select: { id: true, readAt: true },
  })

  return NextResponse.json({
    success: true,
    notification: {
      id: updated.id,
      readAt: updated.readAt ? updated.readAt.toISOString() : null,
    },
  })
}
