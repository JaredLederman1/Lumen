import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  const result = await requireAuth()
  if ('error' in result) return result.error
  const { user: { dbUser } } = result

  const tx = await prisma.transaction.findFirst({
    where: { id, account: { userId: dbUser.id } },
  })
  if (!tx) return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })

  const body = await request.json()
  const { tags } = body

  if (!Array.isArray(tags) || !tags.every((t: unknown) => typeof t === 'string')) {
    return NextResponse.json({ error: 'tags must be an array of strings' }, { status: 400 })
  }

  const normalized = [...new Set(tags.map((t: string) => t.trim().toLowerCase()).filter(Boolean))]

  const updated = await prisma.transaction.update({
    where: { id },
    data: { tags: normalized },
  })

  return NextResponse.json({ transaction: updated })
}
