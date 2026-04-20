import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    await prisma.holding.deleteMany({ where: { accountId: id } })
    await prisma.transaction.deleteMany({ where: { accountId: id } })
    await prisma.account.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to remove account' }, { status: 500 })
  }
}

interface PatchBody {
  customLabel?: string | null
  apr?: number | null
  aprConfirmed?: boolean
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireAuth()
  if ('error' in result) return result.error
  const { user: { dbUser } } = result

  const { id } = await params
  const existing = await prisma.account.findUnique({ where: { id } })
  if (!existing || existing.userId !== dbUser.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const body = (await request.json()) as PatchBody
  const data: {
    customLabel?: string | null
    apr?: number | null
    aprConfirmedAt?: Date | null
  } = {}

  if ('customLabel' in body) {
    const trimmed = typeof body.customLabel === 'string' ? body.customLabel.trim() : null
    data.customLabel = trimmed ? trimmed : null
  }

  if ('apr' in body) {
    // Accept APR as either a decimal (0.24) or a percentage (24). Anything
    // larger than 1 is treated as a percentage and divided by 100.
    if (body.apr === null) {
      data.apr = null
    } else if (typeof body.apr === 'number' && Number.isFinite(body.apr) && body.apr >= 0) {
      data.apr = body.apr > 1 ? body.apr / 100 : body.apr
    }
  }

  if ('aprConfirmed' in body) {
    data.aprConfirmedAt = body.aprConfirmed ? new Date() : null
  }

  const updated = await prisma.account.update({
    where: { id },
    data,
  })

  return NextResponse.json({
    account: {
      id: updated.id,
      customLabel: updated.customLabel,
      apr: updated.apr,
      aprConfirmedAt: updated.aprConfirmedAt ? updated.aprConfirmedAt.toISOString() : null,
    },
  })
}
