/**
 * Environment variable validation
 * Import this at the top of your Next.js config or instrumentation file.
 * Throws at startup if required vars are missing, so you catch config problems
 * before they surface as runtime errors in production.
 */

const REQUIRED_ENV_VARS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'DATABASE_URL',
  'ANTHROPIC_API_KEY',
  'PLAID_CLIENT_ID',
  'PLAID_SECRET',
  'RESEND_API_KEY',
  'RESEND_AUDIENCE_ID',
] as const

type RequiredEnvVar = (typeof REQUIRED_ENV_VARS)[number]

function validateEnv(): Record<RequiredEnvVar, string> {
  const missing: string[] = []

  for (const key of REQUIRED_ENV_VARS) {
    const val = process.env[key]
    if (!val || val.trim() === '') {
      missing.push(key)
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `[illumin] Missing required environment variables:\n  ${missing.join('\n  ')}\n\nAdd them to .env.local and restart the server.`
    )
  }

  // Validate format of keys we can sanity-check
  const anthropicKey = process.env.ANTHROPIC_API_KEY!
  if (!anthropicKey.startsWith('sk-ant-')) {
    throw new Error('[illumin] ANTHROPIC_API_KEY does not look valid (expected sk-ant- prefix)')
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  try {
    new URL(supabaseUrl)
  } catch {
    throw new Error(`[illumin] NEXT_PUBLIC_SUPABASE_URL is not a valid URL: ${supabaseUrl}`)
  }

  return Object.fromEntries(
    REQUIRED_ENV_VARS.map(k => [k, process.env[k]!])
  ) as Record<RequiredEnvVar, string>
}

// Validated env -- throws at import time if config is incomplete
export const env = validateEnv()
