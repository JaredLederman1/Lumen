import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll() { return request.cookies.getAll() }, setAll() {} } },
    )
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const dbUser = await prisma.user.findUnique({ where: { email: user.email! } })
    if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const [snapshots, accounts] = await Promise.all([
      prisma.netWorthSnapshot.findMany({
        where: { userId: dbUser.id },
        orderBy: { recordedAt: 'asc' },
      }),
      prisma.account.findMany({
        where: { userId: dbUser.id },
        select: { classification: true },
      }),
    ])

    const hasAssetAccount = accounts.some(a => a.classification === 'asset')
    const hasLiabilityAccount = accounts.some(a => a.classification === 'liability')

    const history = snapshots.map(s => ({
      date: s.recordedAt.toISOString().split('T')[0],
      netWorth: s.totalAssets - s.totalLiabilities,
      totalAssets: s.totalAssets,
      totalLiabilities: s.totalLiabilities,
    }))

    const hasHistory = history.length >= 2

    let change30d = 0
    if (history.length >= 2) {
      const last = history[history.length - 1]
      const thirtyDaysAgo = new Date(last.date)
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      const target = thirtyDaysAgo.getTime()
      let closest = history[0]
      let closestDiff = Math.abs(new Date(history[0].date).getTime() - target)
      for (const h of history) {
        const diff = Math.abs(new Date(h.date).getTime() - target)
        if (diff < closestDiff) { closestDiff = diff; closest = h }
      }
      change30d = last.netWorth - closest.netWorth
    }

    const changeAllTime = history.length >= 2
      ? history[history.length - 1].netWorth - history[0].netWorth
      : 0

    return NextResponse.json({
      history,
      hasHistory,
      change30d,
      changeAllTime,
      hasAssetAccount,
      hasLiabilityAccount,
    })
  } catch (err) {
    console.error('[networth/history GET]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
