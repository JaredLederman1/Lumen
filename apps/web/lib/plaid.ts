import {
  Configuration,
  PlaidApi,
  PlaidEnvironments,
  Products,
  CountryCode,
  Transaction,
  InvestmentsHoldingsGetResponse,
  InvestmentsTransactionsGetResponse,
} from 'plaid'
import { PLAID_CLIENT_ID, PLAID_SECRET, PLAID_ENV, PLAID_SANDBOX_SECRET } from '@/lib/env'

// Localhost (NODE_ENV=development) runs against Plaid sandbox so we can log in
// with test credentials and avoid production rate limits. Production deploys
// (Vercel) use the real PLAID_ENV + PLAID_SECRET.
const useSandbox = process.env.NODE_ENV === 'development' && !!PLAID_SANDBOX_SECRET

const resolvedEnv = (useSandbox ? 'sandbox' : PLAID_ENV) as keyof typeof PlaidEnvironments
const resolvedSecret = useSandbox ? PLAID_SANDBOX_SECRET : PLAID_SECRET

if (!PlaidEnvironments[resolvedEnv]) {
  console.warn(`[plaid] PLAID_ENV is "${PLAID_ENV}" which is not a valid Plaid environment. Falling back to sandbox.`)
}

if (useSandbox) {
  console.log('[plaid] Using sandbox environment (localhost dev override).')
}

const configuration = new Configuration({
  basePath: PlaidEnvironments[resolvedEnv] || PlaidEnvironments.sandbox,
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': PLAID_CLIENT_ID,
      'PLAID-SECRET': resolvedSecret,
    },
  },
})

export const plaidClient = new PlaidApi(configuration)

export async function createLinkToken(userId: string): Promise<string> {
  const redirectUri = process.env.PLAID_REDIRECT_URI
  const response = await plaidClient.linkTokenCreate({
    user: { client_user_id: userId },
    client_name: 'Illumin',
    products: [Products.Transactions],
    optional_products: [Products.Investments],
    country_codes: [CountryCode.Us],
    language: 'en',
    ...(redirectUri ? { redirect_uri: redirectUri } : {}),
  })
  return response.data.link_token
}

export async function exchangePublicToken(
  publicToken: string
): Promise<{ accessToken: string; itemId: string }> {
  const response = await plaidClient.itemPublicTokenExchange({
    public_token: publicToken,
  })
  return {
    accessToken: response.data.access_token,
    itemId: response.data.item_id,
  }
}

export async function getAccounts(accessToken: string) {
  const response = await plaidClient.accountsGet({
    access_token: accessToken,
  })
  return response.data.accounts
}

export async function getTransactions(
  accessToken: string,
  startDate: string,
  endDate: string
): Promise<Transaction[]> {
  const allTransactions: Transaction[] = []
  let offset = 0
  let total = Infinity

  while (allTransactions.length < total) {
    const response = await plaidClient.transactionsGet({
      access_token: accessToken,
      start_date: startDate,
      end_date: endDate,
      options: { offset, count: 500 },
    })
    const { transactions, total_transactions } = response.data
    total = total_transactions
    allTransactions.push(...transactions)
    offset += transactions.length
    if (transactions.length === 0) break
  }

  return allTransactions
}

export async function syncAccountBalances(accessToken: string) {
  const response = await plaidClient.accountsGet({
    access_token: accessToken,
  })
  return response.data.accounts
}

export async function getHoldings(accessToken: string): Promise<InvestmentsHoldingsGetResponse> {
  const response = await plaidClient.investmentsHoldingsGet({
    access_token: accessToken,
  })
  return response.data
}

export async function getInvestmentHoldings(accessToken: string) {
  const response = await plaidClient.investmentsHoldingsGet({
    access_token: accessToken,
  })
  return {
    holdings: response.data.holdings,
    securities: response.data.securities,
  }
}

export async function getInvestmentTransactions(
  accessToken: string,
  startDate: string,
  endDate: string
): Promise<InvestmentsTransactionsGetResponse> {
  const response = await plaidClient.investmentsTransactionsGet({
    access_token: accessToken,
    start_date: startDate,
    end_date: endDate,
  })
  return response.data
}

export interface AccountAprInfo {
  plaidAccountId: string
  apr: number | null
}

/**
 * Call Plaid /liabilities/get and return a map of account_id → APR as a
 * decimal (0.2399 for 23.99%). Returns [] if the item does not support
 * liabilities (e.g., checking-only items). For credit cards, prefers the
 * purchase APR over promotional/balance-transfer APRs. For student loans,
 * returns interest_rate_percentage / 100.
 */
export async function getLiabilitiesApr(accessToken: string): Promise<AccountAprInfo[]> {
  try {
    const response = await plaidClient.liabilitiesGet({ access_token: accessToken })
    const liabilities = response.data.liabilities
    const results: AccountAprInfo[] = []

    for (const card of liabilities.credit ?? []) {
      if (!card.account_id) continue
      const aprs = card.aprs ?? []
      const purchase = aprs.find(a => a.apr_type === 'purchase_apr')
      const fallback = aprs.find(a => typeof a.apr_percentage === 'number')
      const pct = purchase?.apr_percentage ?? fallback?.apr_percentage ?? null
      results.push({
        plaidAccountId: card.account_id,
        apr: typeof pct === 'number' ? pct / 100 : null,
      })
    }

    for (const loan of liabilities.student ?? []) {
      if (!loan.account_id) continue
      const rate = loan.interest_rate_percentage
      results.push({
        plaidAccountId: loan.account_id,
        apr: typeof rate === 'number' ? rate / 100 : null,
      })
    }

    for (const loan of liabilities.mortgage ?? []) {
      if (!loan.account_id) continue
      const rate = loan.interest_rate?.percentage
      results.push({
        plaidAccountId: loan.account_id,
        apr: typeof rate === 'number' ? rate / 100 : null,
      })
    }

    return results
  } catch (err) {
    // Plaid returns PRODUCT_NOT_READY or NO_LIABILITY_ACCOUNTS for items that
    // have no liabilities. Swallow — the caller just gets no APR updates.
    console.log('[plaid] liabilities/get skipped:', err instanceof Error ? err.message : err)
    return []
  }
}
