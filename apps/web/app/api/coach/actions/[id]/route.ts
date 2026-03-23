import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireAuth()
  if ('error' in result) return result.error
  const { user: { dbUser } } = result
  const { id } = await params

  const body = await request.json()

  const action = await prisma.financialAction.findUnique({ where: { id } })
  if (!action || action.userId !== dbUser.id) {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }

  const updated = await prisma.financialAction.update({
    where: { id },
    data: { done: body.done },
  })

  return Response.json({ action: updated })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireAuth()
  if ('error' in result) return result.error
  const { user: { dbUser } } = result
  const { id } = await params

  const action = await prisma.financialAction.findUnique({ where: { id } })
  if (!action || action.userId !== dbUser.id) {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }

  await prisma.financialAction.delete({ where: { id } })
  return Response.json({ ok: true })
}
