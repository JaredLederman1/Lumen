import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

// DELETE: remove all accounts (and their transactions/holdings) for an institution
export async function DELETE(request: Request) {
  const result = await requireAuth()
  if ('error' in result) return result.error
  const { user: { dbUser } } = result

  const { institutionName } = await request.json()
  if (!institutionName || typeof institutionName !== 'string') {
    return NextResponse.json({ error: 'institutionName is required' }, { status: 400 })
  }

  try {
    const accounts = await prisma.account.findMany({
      where: { userId: dbUser.id, institutionName },
      select: { id: true },
    })

    if (accounts.length === 0) {
      return NextResponse.json({ error: 'No accounts found for that institution' }, { status: 404 })
    }

    const accountIds = accounts.map(a => a.id)

    await prisma.holding.deleteMany({ where: { accountId: { in: accountIds } } })
    await prisma.transaction.deleteMany({ where: { accountId: { in: accountIds } } })
    await prisma.account.deleteMany({ where: { id: { in: accountIds } } })

    return NextResponse.json({ success: true, deletedAccounts: accountIds.length })
  } catch (error) {
    console.error('[accounts/institution DELETE]', error)
    return NextResponse.json({ error: 'Failed to remove institution' }, { status: 500 })
  }
}
