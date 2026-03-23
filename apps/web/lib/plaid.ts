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

const configuration = new Configuration({
  basePath: PlaidEnvironments.sandbox,
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
      'PLAID-SECRET': process.env.PLAID_SECRET,
    },
  },
})

export const plaidClient = new PlaidApi(configuration)

export async function createLinkToken(userId: string): Promise<string> {
  const response = await plaidClient.linkTokenCreate({
    user: { client_user_id: userId },
    client_name: 'Illumin',
    products: [Products.Transactions],
    optional_products: [Products.Investments],
    country_codes: [CountryCode.Us],
    language: 'en',
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
