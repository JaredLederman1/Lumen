import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { prisma } from '@/lib/prisma'

async function getUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
    const { data: { user } } = await supabase.auth.getUser(authHeader.slice(7))
    if (user) return user
  }
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return request.cookies.getAll() }, setAll() {} } },
  )
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function GET(request: NextRequest) {
  try {
    const authUser = await getUser(request)
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const dbUser = await prisma.user.findUnique({ where: { email: authUser.email! } })
    if (!dbUser) return NextResponse.json({ holdings: [] })

    const holdings = await prisma.analyticsHolding.findMany({
      where: { userId: dbUser.id },
      orderBy: { currentValue: 'desc' },
    })

    return NextResponse.json({ holdings })
  } catch (err) {
    console.error('[portfolio/holdings GET]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST syncs holdings from Plaid for all connected investment accounts.
export async function POST(request: NextRequest) {
  try {
    const authUser = await getUser(request)
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const dbUser = await prisma.user.findUnique({ where: { email: authUser.email! } })
    if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const INVESTMENT_TYPES = new Set([
      'brokerage', 'investment', '401k', '403b', 'ira', 'roth', 'roth 401k', '529',
      'pension', 'retirement', 'ugma', 'utma', 'keogh', 'profit sharing plan',
      'money purchase plan', 'simple ira', 'sep ira',
    ])

    const accounts = await prisma.account.findMany({
      where: { userId: dbUser.id, plaidAccessToken: { not: null } },
    })

    const investmentAccounts = accounts.filter(a =>
      INVESTMENT_TYPES.has((a.accountType ?? '').toLowerCase())
    )

    if (investmentAccounts.length === 0) {
      return NextResponse.json({ synced: 0, message: 'No investment accounts found' })
    }

    const { getInvestmentHoldings } = await import('@/lib/plaid')

    const SECTOR_MAP: Record<string, string> = {
      AAPL: 'Technology', MSFT: 'Technology', GOOGL: 'Technology', GOOG: 'Technology',
      META: 'Technology', NVDA: 'Technology', AMD: 'Technology', INTC: 'Technology',
      AMZN: 'Consumer Discretionary', TSLA: 'Consumer Discretionary', HD: 'Consumer Discretionary',
      JPM: 'Financials', BAC: 'Financials', WFC: 'Financials', GS: 'Financials',
      JNJ: 'Healthcare', PFE: 'Healthcare', UNH: 'Healthcare', ABBV: 'Healthcare',
      XOM: 'Energy', CVX: 'Energy', COP: 'Energy',
      NEE: 'Utilities', DUK: 'Utilities',
      SPG: 'Real Estate', AMT: 'Real Estate',
      CAT: 'Industrials', GE: 'Industrials', HON: 'Industrials',
      VTI: 'Broad Market', VOO: 'Broad Market', SPY: 'Broad Market', IVV: 'Broad Market',
      QQQ: 'Technology', VGT: 'Technology',
      VXUS: 'International', EFA: 'International', EEM: 'International Emerging',
      BND: 'Bonds', AGG: 'Bonds', TLT: 'Bonds', VCIT: 'Bonds',
      VNQ: 'Real Estate', IYR: 'Real Estate',
      GLD: 'Commodities', SLV: 'Commodities',
    }

    const GEO_MAP: Record<string, string> = {
      VTI: 'US', VOO: 'US', SPY: 'US', IVV: 'US', QQQ: 'US', VGT: 'US',
      BND: 'US', AGG: 'US', TLT: 'US', VCIT: 'US', VNQ: 'US',
      VXUS: 'International Developed', EFA: 'International Developed',
      EEM: 'Emerging Markets', VWO: 'Emerging Markets',
      GLD: 'Global', SLV: 'Global',
    }

    const BETA_MAP: Record<string, number> = {
      AAPL: 1.24, MSFT: 0.90, GOOGL: 1.05, META: 1.32, NVDA: 1.75, AMD: 1.90,
      AMZN: 1.18, TSLA: 2.10, JPM: 1.15, BAC: 1.30, GS: 1.45,
      JNJ: 0.55, PFE: 0.65, UNH: 0.72,
      XOM: 0.88, CVX: 0.92,
      VTI: 1.00, VOO: 1.00, SPY: 1.00, IVV: 1.00,
      QQQ: 1.12, VGT: 1.20,
      VXUS: 0.92, EFA: 0.88, EEM: 1.10,
      BND: 0.05, AGG: 0.04, TLT: 0.10,
      VNQ: 0.85, GLD: 0.10,
    }

    let synced = 0
    const tokenSet = new Set<string>()

    for (const account of investmentAccounts) {
      if (!account.plaidAccessToken || tokenSet.has(account.plaidAccessToken)) continue
      tokenSet.add(account.plaidAccessToken)

      try {
        const { holdings, securities } = await getInvestmentHoldings(account.plaidAccessToken)
        const securityMap = new Map(securities.map(s => [s.security_id, s]))

        for (const h of holdings) {
          const matchingAccount = investmentAccounts.find(a => a.plaidAccountId === h.account_id)
          if (!matchingAccount) continue

          const security = securityMap.get(h.security_id)
          const ticker = security?.ticker_symbol ?? 'UNKNOWN'
          const name = security?.name ?? ticker
          const currentPrice = h.institution_price ?? security?.close_price ?? 0
          const currentValue = h.quantity * currentPrice
          const costBasis = h.cost_basis ?? null

          let assetClass = 'other'
          const secType = (security?.type ?? '').toLowerCase()
          if (secType === 'equity') assetClass = 'equity'
          else if (secType === 'etf' || secType === 'mutual fund') assetClass = 'etf'
          else if (secType === 'fixed income') assetClass = 'fixed_income'
          else if (secType === 'cash') assetClass = 'cash'

          await prisma.analyticsHolding.upsert({
            where: { accountId_ticker: { accountId: matchingAccount.id, ticker } },
            create: {
              accountId: matchingAccount.id,
              userId: dbUser.id,
              ticker,
              name,
              assetClass,
              sector: SECTOR_MAP[ticker] ?? null,
              geography: GEO_MAP[ticker] ?? 'US',
              quantity: h.quantity,
              costBasis,
              currentPrice,
              currentValue,
              beta: BETA_MAP[ticker] ?? null,
            },
            update: {
              name,
              quantity: h.quantity,
              costBasis,
              currentPrice,
              currentValue,
              sector: SECTOR_MAP[ticker] ?? null,
              geography: GEO_MAP[ticker] ?? 'US',
              beta: BETA_MAP[ticker] ?? null,
            },
          })
          synced++
        }
      } catch (err) {
        console.error(`[portfolio/holdings] Failed to sync token:`, err)
      }
    }

    return NextResponse.json({ synced })
  } catch (err) {
    console.error('[portfolio/holdings POST]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
