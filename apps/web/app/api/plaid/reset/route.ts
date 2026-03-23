import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Dev-only: deletes all accounts and transactions so you can re-connect clean
export async function POST() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }

  try {
    const { count: txCount } = await prisma.transaction.deleteMany({})
    const { count: accountCount } = await prisma.account.deleteMany({})
    return NextResponse.json({ success: true, deletedTransactions: txCount, deletedAccounts: accountCount })
  } catch (error) {
    console.error('[Reset] failed:', error)
    return NextResponse.json({ error: 'Reset failed' }, { status: 500 })
  }
}
