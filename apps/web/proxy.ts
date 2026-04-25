import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { rateLimit, rateLimitStrict } from '@/lib/rateLimit'

const PUBLIC_PATHS = [
  '/',
  '/admin/login',
  '/auth/login',
  '/auth/signup',
  '/auth/mfa/enroll',
  '/auth/mfa/verify',
  '/auth/forgot-password',
  '/auth/update-password',
  '/auth/callback',
  '/api/waitlist',
  '/api/invite/validate',
  '/api/plaid/webhook',
  '/logo',
  '/privacy',
  '/unsubscribe',
]

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isProduction = process.env.NODE_ENV === 'production'

  // Rate limit API routes (production only). In non-production environments
  // all localhost traffic shares a single "unknown" IP bucket, which trips
  // the limiter during normal dev work (hot reloads, multiple tabs, retries).
  if (pathname.startsWith('/api/')) {
    if (!isProduction) {
      if (PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))) {
        return NextResponse.next()
      }
      return handleAuth(request)
    }

    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'

    const isStrictRoute =
      pathname.startsWith('/api/auth/') ||
      pathname.startsWith('/api/plaid/') ||
      pathname.startsWith('/api/invite/')

    const result = isStrictRoute ? rateLimitStrict(ip) : rateLimit(ip)

    if (!result.success) {
      const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000)
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(retryAfter),
            'X-RateLimit-Remaining': '0',
          },
        }
      )
    }

    // For API routes that are also public, skip auth but attach rate limit header
    if (PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))) {
      const response = NextResponse.next()
      response.headers.set('X-RateLimit-Remaining', String(result.remaining))
      return response
    }

    // For authenticated API routes, continue to auth check below
    // and attach rate limit header after
    const response = await handleAuth(request)
    response.headers.set('X-RateLimit-Remaining', String(result.remaining))
    return response
  }

  // Allow public paths through without auth check
  if (PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.next()
  }

  return handleAuth(request)
}

async function handleAuth(request: NextRequest): Promise<NextResponse> {
  const response = NextResponse.next()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  return response
}

export const config = {
  matcher: [
    // Run on all paths except Next.js internals and static files
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
