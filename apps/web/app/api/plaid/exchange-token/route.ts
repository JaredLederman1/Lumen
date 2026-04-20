import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { exchangePublicToken, getAccounts, getTransactions, getHoldings, getLiabilitiesApr } from '@/lib/plaid'
import { prisma } from '@/lib/prisma'
import { categorizeTransaction } from '@/lib/categories'
import { sanitizeMerchantName } from '@/lib/sanitizeMerchantName'

interface PlaidAccountSelection {
  id: string
  name: string
  mask: string | null
  type: string
  subtype: string | null
}

export async function POST(request: NextRequest) {
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

  const body = await request.json()
  const { publicToken, institutionName, accounts: selectedAccounts } = body as {
    publicToken: string
    institutionName: string
    accounts: PlaidAccountSelection[]
  }

  if (!publicToken) {
    return NextResponse.json({ error: 'Missing publicToken' }, { status: 400 })
  }

  // Ensure user record exists
  const dbUser = await prisma.user.upsert({
    where: { email: authUser.email! },
    update: {},
    create: { id: authUser.id, email: authUser.email! },
  })

  const { accessToken, itemId } = await exchangePublicToken(publicToken)

  // Fetch full account details from Plaid
  const plaidAccounts = await getAccounts(accessToken)

  const createdAccounts = []

  for (const plaidAccount of plaidAccounts) {
    // Skip accounts the user did not select (if a selection was provided)
    if (selectedAccounts?.length > 0) {
      const selected = selectedAccounts.find(s => s.id === plaidAccount.account_id)
      if (!selected) continue
    }

    const isLiability = plaidAccount.type === 'credit' || plaidAccount.type === 'loan'
    const classification = isLiability ? 'liability' : 'asset'
    const rawBalance = plaidAccount.balances.current ?? plaidAccount.balances.available ?? 0
    const balance = isLiability ? -Math.abs(rawBalance) : rawBalance
    const accountType = plaidAccount.subtype ?? plaidAccount.type ?? 'checking'
    const last4 = plaidAccount.mask ?? null

    const account = await prisma.account.upsert({
      where: { plaidAccountId: plaidAccount.account_id },
      create: {
        userId: dbUser.id,
        institutionName: institutionName ?? 'Connected Institution',
        accountType,
        classification,
        balance,
        last4,
        plaidAccountId: plaidAccount.account_id,
        plaidAccessToken: accessToken,
        plaidItemId: itemId,
      },
      update: {
        balance,
        classification,
        plaidAccessToken: accessToken,
        plaidItemId: itemId,
      },
    })

    createdAccounts.push(account)
  }

  // Fetch transactions for the last 2 years (covers full sandbox dataset)
  const now = new Date()
  const startDate = new Date(now)
  startDate.setFullYear(startDate.getFullYear() - 2)
  const start = startDate.toISOString().split('T')[0]
  const end = now.toISOString().split('T')[0]

  try {
    const transactions = await getTransactions(accessToken, start, end)
    let savedCount = 0
    for (const tx of transactions) {
      const accountRecord = createdAccounts.find(a => a.plaidAccountId === tx.account_id)
      if (!accountRecord) continue
      try {
        const cleanMerchant = sanitizeMerchantName(tx.merchant_name ?? tx.name ?? null)
        await prisma.transaction.upsert({
          where: { id: tx.transaction_id },
          create: {
            id: tx.transaction_id,
            accountId: accountRecord.id,
            merchantName: cleanMerchant,
            amount: -tx.amount, // Plaid uses positive for debits, we store negative for spending
            category: categorizeTransaction({
              rawCategory: (tx.personal_finance_category?.primary ?? (tx.category?.[0] ?? null))?.replace(/_/g, ' ') ?? null,
              detailedCategory: tx.personal_finance_category?.detailed ?? null,
              accountType: accountRecord.accountType,
              amount: -tx.amount,
              userId: dbUser.id,
              merchantName: cleanMerchant,
              plaidLegacyCategory: tx.category?.[0] ?? null,
            }),
            date: new Date(tx.date),
            pending: tx.pending,
          },
          update: {
            amount: -tx.amount,
            pending: tx.pending,
          },
        })
        savedCount++
      } catch (txSaveErr) {
        console.error(`[Plaid exchange] failed to save tx ${tx.transaction_id}:`, txSaveErr)
      }
    }
    console.log(`[Plaid exchange] saved ${savedCount}/${transactions.length} transactions`)
  } catch (txErr) {
    console.error('[Plaid exchange] transaction fetch failed:', txErr)
  }

  // Pull APR from /liabilities/get for credit cards, student loans, and
  // mortgages. No-op for checking-only items. Any account without a liability
  // row simply keeps apr = null and the detector falls back to 0.24.
  try {
    const aprInfo = await getLiabilitiesApr(accessToken)
    for (const info of aprInfo) {
      const match = createdAccounts.find(a => a.plaidAccountId === info.plaidAccountId)
      if (!match) continue
      await prisma.account.update({
        where: { id: match.id },
        data: { apr: info.apr },
      })
    }
  } catch (aprErr) {
    console.log('[Plaid exchange] liabilities APR step failed:', aprErr)
  }

  // Sync holdings for investment accounts
  try {
    const holdingsData = await getHoldings(accessToken)
    const { holdings, securities } = holdingsData

    for (const security of securities) {
      await prisma.security.upsert({
        where: { plaidSecurityId: security.security_id ?? undefined },
        create: {
          plaidSecurityId: security.security_id,
          ticker: security.ticker_symbol ?? null,
          name: security.name ?? 'Unknown Security',
          type: security.type ?? 'other',
          closePrice: security.close_price ?? null,
          closePriceAt: security.close_price_as_of
            ? new Date(security.close_price_as_of)
            : null,
          isoCode: security.iso_currency_code ?? null,
        },
        update: {
          closePrice: security.close_price ?? null,
          closePriceAt: security.close_price_as_of
            ? new Date(security.close_price_as_of)
            : null,
        },
      })
    }

    for (const holding of holdings) {
      const accountRecord = createdAccounts.find(
        a => a.plaidAccountId === holding.account_id
      )
      if (!accountRecord) continue

      const securityRecord = await prisma.security.findUnique({
        where: { plaidSecurityId: holding.security_id },
      })
      if (!securityRecord) continue

      await prisma.holding.upsert({
        where: {
          accountId_securityId: {
            accountId: accountRecord.id,
            securityId: securityRecord.id,
          },
        },
        create: {
          accountId: accountRecord.id,
          securityId: securityRecord.id,
          quantity: holding.quantity,
          costBasis: holding.cost_basis ?? null,
          value: holding.institution_value ?? 0,
        },
        update: {
          quantity: holding.quantity,
          costBasis: holding.cost_basis ?? null,
          value: holding.institution_value ?? 0,
        },
      })
    }
  } catch (holdingsErr) {
    console.log('[Plaid exchange] holdings not available for this institution:', holdingsErr)
  }

  return NextResponse.json({ accounts: createdAccounts })
}
