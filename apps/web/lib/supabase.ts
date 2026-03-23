import { createBrowserClient } from '@supabase/ssr'
import { SupabaseClient } from '@supabase/supabase-js'

// Lazily initialized so build-time static rendering doesn't fail without env vars
let _supabase: SupabaseClient | null = null

export function getSupabase(): SupabaseClient {
  if (!_supabase) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'
    _supabase = createBrowserClient(url, key)
  }
  return _supabase
}

// Proxy so callers can still write `supabase.auth.signIn(...)` etc.
export const supabase = new Proxy({} as SupabaseClient, {
  get(_t, prop) {
    return getSupabase()[prop as keyof SupabaseClient]
  },
})

export function createServerSupabase(): SupabaseClient {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'placeholder'
  )
}
