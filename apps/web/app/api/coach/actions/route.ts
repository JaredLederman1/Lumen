import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const result = await requireAuth()
  if ('error' in result) return result.error
  const { user: { dbUser } } = result

  const actions = await prisma.financialAction.findMany({
    where: { userId: dbUser.id },
    orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
  })

  return Response.json({ actions })
}

export async function POST(request: Request) {
  const result = await requireAuth()
  if ('error' in result) return result.error
  const { user: { dbUser } } = result

  const body = await request.json()

  // Accepts either a single action or an array
  const items: Array<{
    label: string
    description?: string
    priority?: number
    category?: string
  }> = Array.isArray(body) ? body : [body]

  const created = await prisma.$transaction(
    items.map(item =>
      prisma.financialAction.create({
        data: {
          userId:      dbUser.id,
          label:       item.label,
          description: item.description ?? null,
          priority:    item.priority ?? 0,
          category:    item.category ?? 'general',
        },
      })
    )
  )

  return Response.json({ actions: created }, { status: 201 })
}
