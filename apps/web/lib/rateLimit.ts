/**
 * In-memory rate limiter for Illumin API routes.
 *
 * Uses a sliding window algorithm per (userId | IP). No Redis dependency:
 * works on Vercel's serverless functions with the constraint that limits are
 * per-instance (not globally shared). For a single-region deployment this is
 * fine. If you scale to multiple regions or need strict global limits, replace
 * the store with an Upstash Redis client.
 *
 * Usage in a route:
 *
 *   import { rateLimiter, getRateLimitKey } from '@/lib/rateLimit'
 *
 *   export async function POST(request: NextRequest) {
 *     const limitKey = await getRateLimitKey(request)
 *     const limit = rateLimiter('ai', limitKey)
 *     if (!limit.allowed) {
 *       return limit.response
 *     }
 *     // ... rest of handler
 *   }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

type WindowConfig = {
  windowMs: number    // sliding window duration in milliseconds
  maxRequests: number // max requests allowed within the window
}

/**
 * Named rate limit tiers. Tune these before going to production.
 * AI routes are significantly tighter than data-fetch routes.
 */
const RATE_LIMIT_CONFIGS: Record<string, WindowConfig> = {
  // Anthropic calls: expensive and abuse-prone
  ai: {
    windowMs: 60_000,   // 1 minute
    maxRequests: 10,
  },
  // Plaid token exchange / sync: Plaid has its own limits downstream
  plaid: {
    windowMs: 60_000,
    maxRequests: 20,
  },
  // Standard authenticated data routes
  default: {
    windowMs: 60_000,
    maxRequests: 60,
  },
  // Auth routes: prevent brute force
  auth: {
    windowMs: 15 * 60_000, // 15 minutes
    maxRequests: 10,
  },
  // Waitlist / public unauthenticated endpoints
  public: {
    windowMs: 60_000,
    maxRequests: 5,
  },
}

// ---------------------------------------------------------------------------
// Sliding window store
// ---------------------------------------------------------------------------

type WindowEntry = {
  timestamps: number[]
  blocked: boolean
  blockedUntil: number
}

// In-memory store. Keyed by `tier:identifier`.
const store = new Map<string, WindowEntry>()

// Periodically prune stale entries to avoid unbounded memory growth.
// Runs every 5 minutes.
if (typeof globalThis !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of store.entries()) {
      const maxWindow = Math.max(...Object.values(RATE_LIMIT_CONFIGS).map(c => c.windowMs))
      if (now - Math.max(...(entry.timestamps.length ? entry.timestamps : [0])) > maxWindow * 2) {
        store.delete(key)
      }
    }
  }, 5 * 60_000)
}

// ---------------------------------------------------------------------------
// Core limiter
// ---------------------------------------------------------------------------

type RateLimitResult =
  | { allowed: true }
  | { allowed: false; response: NextResponse }

export function rateLimiter(tier: keyof typeof RATE_LIMIT_CONFIGS, identifier: string): RateLimitResult {
  const config = RATE_LIMIT_CONFIGS[tier] ?? RATE_LIMIT_CONFIGS['default']
  const storeKey = `${tier}:${identifier}`
  const now = Date.now()

  let entry = store.get(storeKey)
  if (!entry) {
    entry = { timestamps: [], blocked: false, blockedUntil: 0 }
    store.set(storeKey, entry)
  }

  // If hard-blocked (repeated violation), check cooldown
  if (entry.blocked && now < entry.blockedUntil) {
    const retryAfter = Math.ceil((entry.blockedUntil - now) / 1000)
    return {
      allowed: false,
      response: NextResponse.json(
        { error: 'Too many requests. Try again later.', retryAfterSeconds: retryAfter },
        {
          status: 429,
          headers: {
            'Retry-After': String(retryAfter),
            'X-RateLimit-Limit': String(config.maxRequests),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(entry.blockedUntil).toISOString(),
          },
        }
      ),
    }
  }

  // Slide the window: drop timestamps older than windowMs
  entry.timestamps = entry.timestamps.filter(t => now - t < config.windowMs)

  if (entry.timestamps.length >= config.maxRequests) {
    // Escalate to a hard block for 2x the window on repeated violations
    entry.blocked = true
    entry.blockedUntil = now + config.windowMs * 2

    const retryAfter = Math.ceil((config.windowMs * 2) / 1000)
    return {
      allowed: false,
      response: NextResponse.json(
        { error: 'Rate limit exceeded.', retryAfterSeconds: retryAfter },
        {
          status: 429,
          headers: {
            'Retry-After': String(retryAfter),
            'X-RateLimit-Limit': String(config.maxRequests),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(entry.blockedUntil).toISOString(),
          },
        }
      ),
    }
  }

  entry.timestamps.push(now)
  entry.blocked = false

  return { allowed: true }
}

// ---------------------------------------------------------------------------
// Key helpers
// ---------------------------------------------------------------------------

/**
 * Get the rate limit key for a request. Prefers authenticated user ID (so
 * limits are per-user across IPs), falls back to IP address.
 */
export async function getRateLimitKey(request: NextRequest): Promise<string> {
  // Try to extract user from Supabase session
  try {
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
    const { data: { user } } = await supabase.auth.getUser()
    if (user?.id) return `user:${user.id}`
  } catch {
    // Fall through to IP-based limiting
  }

  // Bearer token fallback
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const { createClient } = await import('@supabase/supabase-js')
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      )
      const { data: { user } } = await supabase.auth.getUser(authHeader.slice(7))
      if (user?.id) return `user:${user.id}`
    } catch {
      // Fall through
    }
  }

  // IP fallback (less reliable behind proxies, but better than nothing)
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown'
  return `ip:${ip}`
}
