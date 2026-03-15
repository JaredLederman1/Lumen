import { NextResponse } from 'next/server'
import { USE_MOCK_DATA, mockNetWorth } from '@/lib/data'
import { prisma } from '@/lib/prisma'

export async function GET() {
  if (USE_MOCK_DATA) {
    return NextResponse.json({
      netWorth:         mockNetWorth.current,
      totalAssets:      mockNetWorth.totalAssets,
      totalLiabilities: mockNetWorth.totalLiabilities,
    })
  }
  try {
    const accounts = await prisma.account.findMany()
    const totalAssets      = accounts.filter((a: { balance: number }) => a.balance > 0).reduce((s: number, a: { balance: number }) => s + a.balance, 0)
    const totalLiabilities = Math.abs(accounts.filter((a: { balance: number }) => a.balance < 0).reduce((s: number, a: { balance: number }) => s + a.balance, 0))
    const netWorth = totalAssets - totalLiabilities

    if (accounts.length > 0) {
      await prisma.netWorthSnapshot.create({
        data: { userId: accounts[0].userId, totalAssets, totalLiabilities },
      })
    }

    return NextResponse.json({ netWorth, totalAssets, totalLiabilities })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to calculate net worth' }, { status: 500 })
  }
}
