import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { exchangeCodeForToken, fetchAkoyaAccounts, fetchAkoyaTransactions } from '@/lib/akoya'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const code = searchParams.get('code')
  const connectorId = searchParams.get('state')?.split(':')[0] ?? null
  const akoyaError = searchParams.get('error')
  const akoyaErrorDesc = searchParams.get('error_description')

  console.log('[Akoya callback] received params:', {
    code: code ? `${code.slice(0, 8)}…` : null,
    connectorId,
    akoyaError,
    akoyaErrorDesc,
    allParams: Object.fromEntries(searchParams.entries()),
  })

  // Akoya rejected the auth request (e.g. bad client_id, wrong redirect_uri, unknown connector)
  if (akoyaError) {
    console.error('[Akoya callback] Akoya returned an error:', akoyaError, akoyaErrorDesc)
    const msg = encodeURIComponent(akoyaErrorDesc ?? akoyaError)
    return NextResponse.redirect(new URL(`/dashboard/accounts?error=${encodeURIComponent(akoyaError)}&desc=${msg}`, request.url))
  }

  if (!code || !connectorId) {
    console.error('[Akoya callback] missing code or state, got:', { code, connectorId })
    return NextResponse.redirect(new URL('/dashboard/accounts?error=missing_params', request.url))
  }

  try {
    const { access_token, id_token, refresh_token } = await exchangeCodeForToken(code)

    // Resolve authenticated user from session cookie
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
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) {
      return NextResponse.redirect(new URL('/auth/login?error=session_expired', request.url))
    }

    // Fetch accounts from Akoya
    const accountsResponse = await fetchAkoyaAccounts(connectorId, access_token, id_token)
    console.log('[Akoya callback] raw accountsResponse:', JSON.stringify(accountsResponse, null, 2))

    // FDX wraps each account in a typed key e.g. { depositAccount: {...} } or { investmentAccount: {...} }
    // Unwrap to get the raw account object
    const FDX_ACCOUNT_KEYS = ['depositAccount', 'investmentAccount', 'loanAccount', 'lineOfCredit', 'insuranceAccount', 'annuityAccount']
    const akoyaAccounts = (accountsResponse.accounts ?? []).map((entry: Record<string, unknown>) => {
      const key = FDX_ACCOUNT_KEYS.find(k => entry[k])
      const unwrapped = key ? (entry[key] as Record<string, unknown>) : entry
      console.log('[Akoya callback] entry keys:', Object.keys(entry), '| unwrap key:', key ?? 'none', '| unwrapped keys:', Object.keys(unwrapped))
      return unwrapped
    })

    // Ensure user record exists and resolve internal userId
    const dbUser = await prisma.user.upsert({
      where: { email: authUser.email! },
      update: {},
      create: { id: authUser.id, email: authUser.email! },
    })
    const userId = dbUser.id

    for (const akoyaAccount of akoyaAccounts) {
      console.log('[Akoya callback] saving account:', {
        accountId: akoyaAccount.accountId ?? akoyaAccount.id,
        accountType: akoyaAccount.accountType,
        currentBalance: akoyaAccount.currentBalance,
        currentValue: akoyaAccount.currentValue,
        principalBalance: akoyaAccount.principalBalance,
        balance: akoyaAccount.balance,
        allKeys: Object.keys(akoyaAccount),
      })
      const account = await prisma.account.upsert({
        where: { akoyaAccountId: akoyaAccount.accountId ?? akoyaAccount.id },
        create: {
          userId,
          institutionName: connectorId === 'schwab' ? 'Charles Schwab' : connectorId === 'capital-one' ? 'Capital One' : 'Mikomo Bank',
          accountType: akoyaAccount.accountType ?? 'checking',
          balance: akoyaAccount.currentBalance ?? akoyaAccount.currentValue ?? akoyaAccount.principalBalance ?? akoyaAccount.balance ?? 0,
          last4: akoyaAccount.accountNumber?.slice(-4) ?? null,
          akoyaAccountId: akoyaAccount.accountId ?? akoyaAccount.id,
          akoyaToken: access_token,
          akoyaRefreshToken: refresh_token ?? null,
          akoyaConnectorId: connectorId,
        },
        update: {
          balance: akoyaAccount.currentBalance ?? akoyaAccount.currentValue ?? akoyaAccount.principalBalance ?? akoyaAccount.balance ?? 0,
          akoyaToken: access_token,
          akoyaRefreshToken: refresh_token ?? null,
          akoyaConnectorId: connectorId,
        },
      })

      // Fetch and save transactions
      try {
        const txResponse = await fetchAkoyaTransactions(connectorId, account.akoyaAccountId!, access_token)
        const txList = txResponse.transactions ?? []

        for (const tx of txList) {
          await prisma.transaction.upsert({
            where: { id: tx.transactionId ?? tx.id },
            create: {
              id: tx.transactionId ?? tx.id,
              accountId: account.id,
              merchantName: tx.merchant?.name ?? tx.description ?? null,
              amount: tx.amount ?? 0,
              category: tx.category ?? null,
              date: new Date(tx.transactionTimestamp ?? tx.date),
              pending: tx.status === 'PENDING',
            },
            update: {
              amount: tx.amount ?? 0,
              pending: tx.status === 'PENDING',
            },
          })
        }
      } catch (txErr) {
        console.error(`Failed to fetch transactions for account ${account.id}:`, txErr)
      }
    }

    return NextResponse.redirect(new URL('/dashboard/accounts?success=connected', request.url))
  } catch (error) {
    console.error('Akoya callback error:', error)
    const msg = encodeURIComponent(error instanceof Error ? error.message : String(error))
    return NextResponse.redirect(new URL(`/dashboard/accounts?error=connection_failed&desc=${msg}`, request.url))
  }
}
