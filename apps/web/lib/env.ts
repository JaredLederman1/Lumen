/**
 * Runtime environment variable validation.
 * Import in API routes and server-side lib files only.
 * Do NOT import in proxy.ts or client-side code.
 *
 * Throws at import time if any required variable is missing or empty,
 * so configuration problems surface immediately on startup.
 */

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value || value.trim() === '') {
    throw new Error(
      `[illumin] Missing required environment variable: ${name}. ` +
      'Add it to .env.local and restart the server.'
    )
  }
  return value
}

export const DATABASE_URL = requireEnv('DATABASE_URL')
export const DIRECT_URL = requireEnv('DIRECT_URL')
export const NEXT_PUBLIC_SUPABASE_URL = requireEnv('NEXT_PUBLIC_SUPABASE_URL')
export const NEXT_PUBLIC_SUPABASE_ANON_KEY = requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
export const SUPABASE_SERVICE_ROLE_KEY = requireEnv('SUPABASE_SERVICE_ROLE_KEY')
export const PLAID_CLIENT_ID = requireEnv('PLAID_CLIENT_ID')
export const PLAID_SECRET = requireEnv('PLAID_SECRET')
export const PLAID_ENV = requireEnv('PLAID_ENV')
export const PLAID_SANDBOX_SECRET = process.env.PLAID_SANDBOX_SECRET ?? ''
export const ANTHROPIC_API_KEY = requireEnv('ANTHROPIC_API_KEY')
export const RESEND_API_KEY = requireEnv('RESEND_API_KEY')
