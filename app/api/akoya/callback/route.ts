import { NextRequest, NextResponse } from 'next/server'
import { exchangeCodeForToken, fetchAkoyaAccounts, fetchAkoyaTransactions } from '@/lib/akoya'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const code = searchParams.get('code')
  const connectorId = searchParams.get('state')
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
    const { access_token } = await exchangeCodeForToken(code)

    // Fetch accounts from Akoya
    const accountsResponse = await fetchAkoyaAccounts(connectorId, access_token)
    const akoyaAccounts = accountsResponse.accounts ?? []

    // For demo: use a placeholder userId; in production, get from session
    const userId = 'user_demo'

    // Ensure the demo user exists (foreign key requirement)
    await prisma.user.upsert({
      where: { id: userId },
      create: { id: userId, email: 'demo@illumin.app' },
      update: {},
    })

    for (const akoyaAccount of akoyaAccounts) {
      const account = await prisma.account.upsert({
        where: { akoyaAccountId: akoyaAccount.accountId ?? akoyaAccount.id },
        create: {
          userId,
          institutionName: connectorId === 'schwab' ? 'Charles Schwab' : connectorId === 'capital-one' ? 'Capital One' : 'Mikomo Bank',
          accountType: akoyaAccount.accountType ?? 'checking',
          balance: akoyaAccount.currentBalance ?? akoyaAccount.balance ?? 0,
          last4: akoyaAccount.accountNumber?.slice(-4) ?? null,
          akoyaAccountId: akoyaAccount.accountId ?? akoyaAccount.id,
          akoyaToken: access_token,
        },
        update: {
          balance: akoyaAccount.currentBalance ?? akoyaAccount.balance ?? 0,
          akoyaToken: access_token,
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
    return NextResponse.redirect(new URL('/dashboard/accounts?error=connection_failed', request.url))
  }
}
