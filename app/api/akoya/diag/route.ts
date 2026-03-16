import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { fetchAkoyaTransactions, normalizeAkoyaAccounts, fetchAkoyaAccounts } from '@/lib/akoya'

// Dev-only diagnostic: shows DB state and live-tests the transaction fetch
export async function GET() {
  try {
    const accounts = await prisma.account.findMany()
    const txCount = await prisma.transaction.count()

    const accountSummary = accounts.map(a => ({
      id: a.id,
      institutionName: a.institutionName,
      accountType: a.accountType,
      akoyaAccountId: a.akoyaAccountId,
      akoyaConnectorId: a.akoyaConnectorId,
      hasToken: !!a.akoyaToken,
      hasRefreshToken: !!a.akoyaRefreshToken,
    }))

    // For the first account with a token, live-test the transaction fetch
    const testAccount = accounts.find(a => a.akoyaToken && a.akoyaAccountId && a.akoyaConnectorId)
    let liveTest: Record<string, unknown> = { skipped: 'no account with token found' }

    if (testAccount) {
      try {
        // Test accounts endpoint first to see raw structure
        const accountsRaw = await fetchAkoyaAccounts(testAccount.akoyaConnectorId!, testAccount.akoyaToken!)
        const normalized = normalizeAkoyaAccounts(accountsRaw)
        const matchingAccount = normalized.find((a: Record<string, unknown>) =>
          (a.accountId ?? a.id) === testAccount.akoyaAccountId
        )
        const embeddedTxCount = Array.isArray((matchingAccount as Record<string, unknown>)?.transactions)
          ? ((matchingAccount as Record<string, unknown>).transactions as unknown[]).length
          : 0

        // Test transactions endpoint
        let txEndpointResult: unknown = null
        let txEndpointError: string | null = null
        try {
          const txResponse = await fetchAkoyaTransactions(
            testAccount.akoyaConnectorId!,
            testAccount.akoyaAccountId!,
            testAccount.akoyaToken!
          )
          txEndpointResult = {
            keys: Object.keys(txResponse ?? {}),
            transactionCount: txResponse?.transactions?.length ?? 0,
            firstTx: txResponse?.transactions?.[0] ?? null,
          }
        } catch (e) {
          txEndpointError = String(e)
        }

        liveTest = {
          accountId: testAccount.akoyaAccountId,
          connectorId: testAccount.akoyaConnectorId,
          normalizedAccountCount: normalized.length,
          matchingAccountFound: !!matchingAccount,
          matchingAccountKeys: matchingAccount ? Object.keys(matchingAccount) : [],
          embeddedTransactionCount: embeddedTxCount,
          firstEmbeddedTx: embeddedTxCount > 0
            ? (matchingAccount as Record<string, unknown>).transactions as unknown[]
            : null,
          txEndpointResult,
          txEndpointError,
        }
      } catch (e) {
        liveTest = { error: String(e) }
      }
    }

    return NextResponse.json({
      dbAccounts: accountSummary.length,
      dbTransactions: txCount,
      accounts: accountSummary,
      liveTest,
    }, { status: 200 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
