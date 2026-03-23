import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireAuth()
  if ('error' in result) return result.error
  const { user: { dbUser } } = result

  const { id } = await params
  const body = await request.json()

  // Verify ownership before updating
  const existing = await prisma.checklistItem.findFirst({
    where: { id, userId: dbUser.id },
  })
  if (!existing) {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }

  const updated = await prisma.checklistItem.update({
    where: { id },
    data: { completed: body.completed },
  })

  return Response.json({ item: updated })
}
