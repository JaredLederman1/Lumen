import { headers as getHeaders, cookies as getCookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { User } from '@supabase/supabase-js'

type DbUser = { id: string; email: string; createdAt: Date }

type AuthSuccess = { user: { authUser: User; dbUser: DbUser } }
type AuthFailure = { error: NextResponse }

/**
 * Validates the current request's session (Bearer token or cookie)
 * and returns the authenticated Supabase user + the corresponding
 * Prisma User row (creating it on first access if absent).
 *
 * Usage in a route handler:
 *   const result = await requireAuth()
 *   if ('error' in result) return result.error
 *   const { user: { dbUser } } = result
 */
export async function requireAuth(): Promise<AuthSuccess | AuthFailure> {
  const headersList = await getHeaders()
  const authHeader = headersList.get('authorization')

  let authUser: User | null = null

  // Prefer Bearer token (client-side fetches send this)
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
    const { data: { user } } = await supabase.auth.getUser(token)
    authUser = user
  }

  // Fall back to session cookie (SSR / server components)
  if (!authUser) {
    const cookieStore = await getCookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll() {},
        },
      },
    )
    const { data: { user } } = await supabase.auth.getUser()
    authUser = user
  }

  if (!authUser?.email) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const dbUser = await prisma.user.upsert({
    where: { email: authUser.email },
    update: {},
    create: { id: authUser.id, email: authUser.email },
  })

  return { user: { authUser, dbUser } }
}
