import { NextResponse } from 'next/server'
import { USE_MOCK_DATA, mockAccounts } from '@/lib/data'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function GET() {
  if (USE_MOCK_DATA) {
    return NextResponse.json({ accounts: mockAccounts })
  }

  const result = await requireAuth()
  if ('error' in result) return result.error
  const { user: { dbUser } } = result

  try {
    const accounts = await prisma.account.findMany({
      where: { userId: dbUser.id },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ accounts })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch accounts' }, { status: 500 })
  }
}
