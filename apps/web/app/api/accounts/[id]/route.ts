import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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
