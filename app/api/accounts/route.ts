import { NextResponse } from 'next/server'
import { USE_MOCK_DATA, mockAccounts } from '@/lib/data'
import { prisma } from '@/lib/prisma'

export async function GET() {
  if (USE_MOCK_DATA) {
    return NextResponse.json({ accounts: mockAccounts })
  }
  try {
    const accounts = await prisma.account.findMany({
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ accounts })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch accounts' }, { status: 500 })
  }
}
