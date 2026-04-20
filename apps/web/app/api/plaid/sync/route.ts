import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { syncAccountBalances, getTransactions, getHoldings, getLiabilitiesApr } from '@/lib/plaid'
import { prisma } from '@/lib/prisma'
import { categorizeTransaction } from '@/lib/categories'
import { sanitizeMerchantName } from '@/lib/sanitizeMerchantName'

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

  try {
    const dbUser = await prisma.user.findUnique({ where: { email: authUser.email! } })
    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const accounts = await prisma.account.findMany({
      where: { userId: dbUser.id, plaidAccessToken: { not: null } },
    })

    if (accounts.length === 0) {
      return NextResponse.json({ message: 'No connected accounts to sync', synced: 0 })
    }

    // Group accounts by access token to minimize API calls
    const tokenMap = new Map<string, typeof accounts>()
    for (const account of accounts) {
      if (!account.plaidAccessToken) continue
      const group = tokenMap.get(account.plaidAccessToken) ?? []
      group.push(account)
      tokenMap.set(account.plaidAccessToken, group)
    }

    const categoryRules = await prisma.categoryRule.findMany({
      where: { userId: dbUser.id },
    })
    const ruleMap = new Map(
      categoryRules.map(r => [r.merchantName.toLowerCase(), r.category])
    )

    const renameRules = await prisma.merchantRenameRule.findMany({
      where: { userId: dbUser.id },
    })
    const renameMap = new Map(
      renameRules.map(r => [r.originalName.toLowerCase(), r.renamedTo])
    )

    let updatedAccounts = 0
    let updatedTransactions = 0

    // Counters for [categorization:summary] log. Cover every transaction that
    // flows through categorizeTransaction in this sync run, across all access
    // token groups.
    let categorizedTotal = 0
    let categorizedOther = 0

    const now = new Date()
    const startDate = new Date(now)
    startDate.setFullYear(startDate.getFullYear() - 2)
    const start = startDate.toISOString().split('T')[0]
    const end = now.toISOString().split('T')[0]

    for (const [accessToken, accountGroup] of tokenMap) {
      try {
        const plaidAccounts = await syncAccountBalances(accessToken)

        for (const account of accountGroup) {
          const plaidAccount = plaidAccounts.find(p => p.account_id === account.plaidAccountId)
          if (!plaidAccount) continue

          const isLiability = plaidAccount.type === 'credit' || plaidAccount.type === 'loan'
          const rawBalance = plaidAccount.balances.current ?? plaidAccount.balances.available ?? account.balance
          const balance = isLiability ? -Math.abs(rawBalance) : rawBalance
          await prisma.account.update({
            where: { id: account.id },
            data: { balance },
          })
          updatedAccounts++
        }

        // Fetch recent transactions
        try {
          const transactions = await getTransactions(accessToken, start, end)
          for (const tx of transactions) {
            const accountRecord = accountGroup.find(a => a.plaidAccountId === tx.account_id)
            if (!accountRecord) continue
            try {
              const rawMerchant = sanitizeMerchantName(tx.merchant_name ?? tx.name ?? null)
              const merchantKey = (rawMerchant ?? '').toLowerCase()
              const resolvedMerchant = renameMap.get(merchantKey) ?? rawMerchant
              const overrideCategory = ruleMap.get(merchantKey) ?? null
              const rawPlaidCategory = (tx.personal_finance_category?.primary ?? (tx.category?.[0] ?? null))?.replace(/_/g, ' ') ?? null
              const detailedCategory = tx.personal_finance_category?.detailed ?? null
              const category = categorizeTransaction({
                rawCategory: rawPlaidCategory,
                detailedCategory,
                accountType: accountRecord.accountType,
                amount: -tx.amount,
                overrideCategory,
                userId: dbUser.id,
                merchantName: resolvedMerchant,
                plaidLegacyCategory: tx.category?.[0] ?? null,
              })
              categorizedTotal++
              if (category === 'Other') categorizedOther++

              await prisma.transaction.upsert({
                where: { id: tx.transaction_id },
                create: {
                  id: tx.transaction_id,
                  accountId: accountRecord.id,
                  merchantName: resolvedMerchant,
                  amount: -tx.amount,
                  category,
                  date: new Date(tx.date),
                  pending: tx.pending,
                },
                update: {
                  amount: -tx.amount,
                  category,
                  pending: tx.pending,
                },
              })
              updatedTransactions++
            } catch {
              // Skip duplicates
            }
          }
        } catch (txErr) {
          console.error('[Plaid sync] transaction fetch failed:', txErr)
        }

        // Refresh APR from /liabilities/get. Silently no-ops when the item
        // has no liability accounts.
        try {
          const aprInfo = await getLiabilitiesApr(accessToken)
          for (const info of aprInfo) {
            const match = accountGroup.find(a => a.plaidAccountId === info.plaidAccountId)
            if (!match) continue
            // Respect user-confirmed APRs: once they've verified the rate
            // against their loan documents, don't let Plaid overwrite it.
            if (match.aprConfirmedAt) continue
            await prisma.account.update({
              where: { id: match.id },
              data: { apr: info.apr },
            })
          }
        } catch (aprErr) {
          console.log('[Plaid sync] liabilities APR step failed:', aprErr)
        }

        // Sync holdings
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
            const accountRecord = accountGroup.find(a => a.plaidAccountId === holding.account_id)
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
          console.log('[Plaid sync] holdings not available for this institution:', holdingsErr)
        }
      } catch (err) {
        console.error('[Plaid sync] failed for access token group:', err)
      }
    }

    if (categorizedTotal > 0) {
      const otherRate = Math.round((categorizedOther / categorizedTotal) * 1000) / 1000
      console.log('[categorization:summary]', {
        userId: dbUser.id,
        total: categorizedTotal,
        otherCount: categorizedOther,
        otherRate,
      })
    }

    return NextResponse.json({ success: true, updatedAccounts, updatedTransactions })
  } catch (error) {
    console.error('[Plaid sync] error:', error)
    const message = error instanceof Error ? error.message : 'Sync failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
