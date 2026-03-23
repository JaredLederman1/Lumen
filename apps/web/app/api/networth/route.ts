import { NextResponse } from 'next/server'
import { USE_MOCK_DATA, mockNetWorth } from '@/lib/data'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function GET() {
  if (USE_MOCK_DATA) {
    return NextResponse.json({
      netWorth:         mockNetWorth.current,
      totalAssets:      mockNetWorth.totalAssets,
      totalLiabilities: mockNetWorth.totalLiabilities,
    })
  }

  const result = await requireAuth()
  if ('error' in result) return result.error
  const { user: { dbUser } } = result

  try {
    const accounts = await prisma.account.findMany({ where: { userId: dbUser.id } })
    const totalAssets      = accounts.filter((a: { classification: string }) => a.classification === 'asset').reduce((s: number, a: { balance: number }) => s + a.balance, 0)
    const totalLiabilities = accounts.filter((a: { classification: string }) => a.classification === 'liability').reduce((s: number, a: { balance: number }) => s + Math.abs(a.balance), 0)
    const netWorth = totalAssets - totalLiabilities

    // Fetch the most recent snapshot for month-over-month comparison before writing a new one
    const lastSnapshot = accounts.length > 0
      ? await prisma.netWorthSnapshot.findFirst({
          where: { userId: dbUser.id },
          orderBy: { recordedAt: 'desc' },
        })
      : null
    const previousNetWorth = lastSnapshot
      ? lastSnapshot.totalAssets - lastSnapshot.totalLiabilities
      : netWorth

    // Write a new snapshot only if there is none recorded today
    if (accounts.length > 0) {
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)
      const todaySnapshot = await prisma.netWorthSnapshot.findFirst({
        where: { userId: dbUser.id, recordedAt: { gte: todayStart } },
      })
      if (!todaySnapshot) {
        await prisma.netWorthSnapshot.create({
          data: { userId: dbUser.id, totalAssets, totalLiabilities },
        })
      }
    }

    return NextResponse.json({ netWorth, previousNetWorth, totalAssets, totalLiabilities })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to calculate net worth' }, { status: 500 })
  }
}
