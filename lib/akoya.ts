const AKOYA_SANDBOX_IDP = 'https://sandbox-idp.ddp.akoya.com'
const AKOYA_SANDBOX_PRODUCTS = 'https://sandbox-products.ddp.akoya.com'

export function getAkoyaAuthUrl(connectorId: string): string {
  const clientId = process.env.AKOYA_CLIENT_ID
  const redirectUri = process.env.AKOYA_REDIRECT_URI

  console.log('[Akoya] Building auth URL:', {
    connectorId,
    clientId: clientId ? `${clientId.slice(0, 8)}…` : 'MISSING',
    redirectUri: redirectUri ?? 'MISSING',
    clientSecret: process.env.AKOYA_CLIENT_SECRET ? 'set' : 'MISSING',
  })

  const params = new URLSearchParams({
    connector: connectorId,
    client_id: clientId!,
    redirect_uri: redirectUri!,
    response_type: 'code',
    scope: 'openid profile offline_access',
    state: `${connectorId}:${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`,
  })

  const url = `${AKOYA_SANDBOX_IDP}/auth?${params.toString()}`
  console.log('[Akoya] Full auth URL:', url)
  return url
}

export async function exchangeCodeForToken(
  code: string
): Promise<{ access_token: string; id_token?: string; refresh_token: string }> {
  const credentials = Buffer.from(
    `${process.env.AKOYA_CLIENT_ID}:${process.env.AKOYA_CLIENT_SECRET}`
  ).toString('base64')

  const res = await fetch(`${AKOYA_SANDBOX_IDP}/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${credentials}`,
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: process.env.AKOYA_REDIRECT_URI!,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Token exchange failed: ${err}`)
  }

  const tokenData = await res.json()
  console.log('[Akoya] token response keys:', Object.keys(tokenData))
  console.log('[Akoya] token_type:', tokenData.token_type)
  console.log('[Akoya] scope:', tokenData.scope)
  console.log('[Akoya] access_token prefix:', tokenData.access_token?.slice(0, 40))
  return tokenData
}

export async function refreshAkoyaToken(
  refreshToken: string
): Promise<{ access_token: string; refresh_token: string }> {
  const credentials = Buffer.from(
    `${process.env.AKOYA_CLIENT_ID}:${process.env.AKOYA_CLIENT_SECRET}`
  ).toString('base64')

  const res = await fetch(`${AKOYA_SANDBOX_IDP}/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${credentials}`,
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Token refresh failed: ${err}`)
  }

  return res.json()
}

export async function fetchAkoyaAccounts(
  connectorId: string,
  accessToken: string,
  idToken?: string
) {
  const url = `${AKOYA_SANDBOX_PRODUCTS}/accounts/v2/${connectorId}`

  // Try access_token first, fall back to id_token (Akoya sometimes requires id_token)
  const tokens = [accessToken, ...(idToken && idToken !== accessToken ? [idToken] : [])]

  for (const token of tokens) {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) return res.json()
    const body = await res.text()
    console.error('[Akoya] accounts error with token type:', res.status, body)
    if (tokens.indexOf(token) === tokens.length - 1) {
      throw new Error(`Failed to fetch accounts: ${res.status} ${res.statusText} — ${body}`)
    }
  }
}

export async function fetchAkoyaTransactions(
  connectorId: string,
  accountId: string,
  accessToken: string
) {
  // Use a wide date range: sandbox data is from 2019-2020 so we go back 10 years
  const startDate = new Date()
  startDate.setFullYear(startDate.getFullYear() - 10)
  const params = new URLSearchParams({
    startDate: startDate.toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  })

  const url = `${AKOYA_SANDBOX_PRODUCTS}/transactions/v2/${connectorId}/${accountId}?${params}`
  console.log('[Akoya] fetchAkoyaTransactions:', url.replace(accountId, accountId.slice(0, 12) + '…'))
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Failed to fetch transactions: ${res.status} ${res.statusText} — ${body}`)
  }
  return res.json()
}

const FDX_ACCOUNT_KEYS = ['depositAccount', 'investmentAccount', 'loanAccount', 'lineOfCredit', 'insuranceAccount', 'annuityAccount'] as const

/**
 * Normalize the accounts response into a flat array of raw account objects.
 * Handles both FDX array format ([{ depositAccount: {...} }]) and typed-object
 * format ({ investmentAccount: [...] }).
 */
export function normalizeAkoyaAccounts(accountsResponse: Record<string, unknown>): Record<string, unknown>[] {
  const accounts = accountsResponse.accounts
  if (Array.isArray(accounts)) {
    return accounts.map((entry: Record<string, unknown>) => {
      const key = FDX_ACCOUNT_KEYS.find(k => entry[k])
      return key ? (entry[key] as Record<string, unknown>) : entry
    })
  }
  if (accounts && typeof accounts === 'object') {
    // Older Akoya format: { investmentAccount: [...], depositAccount: [...], ... }
    const result: Record<string, unknown>[] = []
    for (const key of FDX_ACCOUNT_KEYS) {
      const typed = (accounts as Record<string, unknown>)[key]
      if (Array.isArray(typed)) result.push(...typed)
    }
    return result
  }
  return []
}

/**
 * Parse an Akoya transaction timestamp.
 * The Mikomo sandbox returns Unix epoch SECONDS (e.g. 1569816000) as a number,
 * not milliseconds. If the value is a number < 1e10 treat it as seconds.
 */
export function parseAkoyaDate(val: unknown): Date | null {
  if (val == null) return null
  let ms: number
  if (typeof val === 'number') {
    ms = val < 1e10 ? val * 1000 : val   // seconds -> ms
  } else {
    ms = new Date(val as string).getTime()
  }
  if (isNaN(ms)) return null
  return new Date(ms)
}

/**
 * Extract transactions that Akoya embeds directly inside an account object.
 * Investment accounts in particular return their transactions this way.
 */
export function extractEmbeddedTransactions(account: Record<string, unknown>): Record<string, unknown>[] {
  return Array.isArray(account.transactions) ? account.transactions as Record<string, unknown>[] : []
}
