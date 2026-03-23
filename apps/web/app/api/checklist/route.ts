import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const result = await requireAuth()
  if ('error' in result) return result.error
  const { user: { dbUser } } = result

  const items = await prisma.checklistItem.findMany({
    where: { userId: dbUser.id },
    orderBy: { createdAt: 'desc' },
  })

  return Response.json({ items })
}

export async function POST(request: NextRequest) {
  const result = await requireAuth()
  if ('error' in result) return result.error
  const { user: { dbUser } } = result

  const body = await request.json()
  const items: string[] = body.items ?? []

  // Fetch existing items to avoid case-insensitive duplicates
  const existing = await prisma.checklistItem.findMany({
    where: { userId: dbUser.id },
    select: { text: true },
  })
  const existingTexts = new Set(existing.map((e) => e.text.toLowerCase()))

  const toCreate = items.filter((text) => !existingTexts.has(text.toLowerCase()))
  const skipped = items.length - toCreate.length

  if (toCreate.length > 0) {
    await prisma.$transaction(
      toCreate.map((text) =>
        prisma.checklistItem.create({
          data: { userId: dbUser.id, text },
        })
      )
    )
  }

  return Response.json({ created: toCreate.length, skipped })
}

export async function DELETE(request: NextRequest) {
  const result = await requireAuth()
  if ('error' in result) return result.error
  const { user: { dbUser } } = result

  const body = await request.json()
  if (!body.completed) {
    return Response.json({ error: 'Only completed items can be deleted this way' }, { status: 400 })
  }

  const { count } = await prisma.checklistItem.deleteMany({
    where: { userId: dbUser.id, completed: true },
  })

  return Response.json({ deleted: count })
}
