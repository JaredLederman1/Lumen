import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const accounts = await prisma.account.findMany()
    const totalAssets = accounts.filter((a: { balance: number }) => a.balance > 0).reduce((s: number, a: { balance: number }) => s + a.balance, 0)
    const totalLiabilities = Math.abs(accounts.filter(a => a.balance < 0).reduce((s: number, a) => s + a.balance, 0))
    const netWorth = totalAssets - totalLiabilities

    // Save snapshot
    if (accounts.length > 0) {
      await prisma.netWorthSnapshot.create({
        data: {
          userId: accounts[0].userId,
          totalAssets,
          totalLiabilities,
        },
      })
    }

    return NextResponse.json({ netWorth, totalAssets, totalLiabilities })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to calculate net worth' }, { status: 500 })
  }
}
