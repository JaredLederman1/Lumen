import { NextRequest, NextResponse } from 'next/server'
import { USE_MOCK_DATA, mockTransactions } from '@/lib/data'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const accountId = searchParams.get('accountId')
  const category  = searchParams.get('category')
  const page      = parseInt(searchParams.get('page')  ?? '1')
  const limit     = parseInt(searchParams.get('limit') ?? '20')

  if (USE_MOCK_DATA) {
    const filtered = mockTransactions.filter(tx => {
      if (accountId && tx.accountId !== accountId) return false
      if (category  && tx.category  !== category)  return false
      return true
    })
    const start = (page - 1) * limit
    const transactions = filtered.slice(start, start + limit)
    return NextResponse.json({ transactions, total: filtered.length, page, limit })
  }

  try {
    const where = {
      ...(accountId && { accountId }),
      ...(category  && { category }),
    }
    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        orderBy: { date: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.transaction.count({ where }),
    ])
    return NextResponse.json({ transactions, total, page, limit })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 })
  }
}
