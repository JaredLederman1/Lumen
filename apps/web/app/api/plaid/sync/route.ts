import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { prisma } from '@/lib/prisma'
import { syncPlaidForUser } from '@/lib/plaid/sync'

export async function POST(request: NextRequest) {
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

  try {
    const dbUser = await prisma.user.findUnique({ where: { email: authUser.email! } })
    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const result = await syncPlaidForUser(dbUser.id)

    if (result.hadNoConnectedAccounts) {
      return NextResponse.json({ message: 'No connected accounts to sync', synced: 0 })
    }

    return NextResponse.json({
      success: true,
      updatedAccounts: result.updatedAccounts,
      updatedTransactions: result.updatedTransactions,
    })
  } catch (error) {
    console.error('[Plaid sync] error:', error)
    const message = error instanceof Error ? error.message : 'Sync failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
