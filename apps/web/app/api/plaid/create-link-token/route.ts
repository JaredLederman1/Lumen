import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createLinkToken } from '@/lib/plaid'
import { prisma } from '@/lib/prisma'
import { rateLimiter, getRateLimitKey } from '@/lib/rateLimit'

export async function GET(request: NextRequest) {
  const limitKey = await getRateLimitKey(request)
  const limit = rateLimiter('plaid', limitKey)
  if (!limit.allowed) return limit.response

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

  const linkToken = await createLinkToken(dbUser.id)
  return NextResponse.json({ linkToken })
}
