import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createLinkToken } from '@/lib/plaid'
import { prisma } from '@/lib/prisma'
export async function GET(request: NextRequest) {
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

  // Ensure user record exists
  const dbUser = await prisma.user.upsert({
    where: { email: authUser.email! },
    update: {},
    create: { id: authUser.id, email: authUser.email! },
  })

  try {
    const linkToken = await createLinkToken(dbUser.id)
    return NextResponse.json({ linkToken })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    const plaidError = (err as { response?: { data?: unknown } })?.response?.data
    const detail = plaidError ?? message
    console.error('[create-link-token] Plaid error:', detail)
    console.error('[create-link-token] PLAID_ENV:', process.env.PLAID_ENV, 'PLAID_CLIENT_ID:', process.env.PLAID_CLIENT_ID?.slice(0, 6) + '...')
    return NextResponse.json(
      { error: 'Failed to create link token', detail },
      { status: 500 }
    )
  }
}
