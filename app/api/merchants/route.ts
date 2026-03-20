import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { prisma } from '@/lib/prisma'

interface MerchantSummary {
  name: string
  totalSpent: number
  transactionCount: number
  lastDate: string
  category: string | null
  accountIds: string[]
  percentOfTotal: number
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return request.cookies.getAll() },
          setAll() {},
        },
      }
    )

    const { data: { user: authUser } } = token
      ? await supabase.auth.getUser(token)
      : await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const dbUser = await prisma.user.findUnique({ where: { email: authUser.email! } })
    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const since = new Date()
    since.setDate(since.getDate() - 30)

    const transactions = await prisma.transaction.findMany({
      where: {
        account: { userId: dbUser.id },
        date: { gte: since },
        amount: { lt: 0 },
        pending: false,
      },
      include: { account: true },
      orderBy: { date: 'desc' },
    })

    const totalSpend = transactions.reduce((s, tx) => s + Math.abs(tx.amount), 0)

    // Group by merchant name (case-insensitive trim, fallback to "Unknown")
    const merchantMap: Record<string, {
      name: string
      totalSpent: number
      transactionCount: number
      lastDate: string
      category: string | null
      accountIds: Set<string>
    }> = {}

    for (const tx of transactions) {
      const displayName = tx.merchantName?.trim() || 'Unknown'
      const key = displayName.toLowerCase()

      if (!merchantMap[key]) {
        // Transactions are ordered desc so first encounter is most recent date
        merchantMap[key] = {
          name: displayName,
          totalSpent: 0,
          transactionCount: 0,
          lastDate: tx.date.toISOString(),
          category: tx.category,
          accountIds: new Set<string>(),
        }
      }

      merchantMap[key].totalSpent += Math.abs(tx.amount)
      merchantMap[key].transactionCount += 1
      merchantMap[key].accountIds.add(tx.accountId)
    }

    const merchants: MerchantSummary[] = Object.values(merchantMap)
      .map(m => ({
        name: m.name,
        totalSpent: Math.round(m.totalSpent),
        transactionCount: m.transactionCount,
        lastDate: m.lastDate,
        category: m.category,
        accountIds: Array.from(m.accountIds),
        percentOfTotal: totalSpend > 0 ? (m.totalSpent / totalSpend) * 100 : 0,
      }))
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 15)

    return NextResponse.json({
      merchants,
      totalSpend: Math.round(totalSpend),
      periodLabel: 'Last 30 days',
    })
  } catch (error) {
    console.error('[merchants]', error)
    return NextResponse.json({ error: 'Failed to fetch merchant data' }, { status: 500 })
  }
}
