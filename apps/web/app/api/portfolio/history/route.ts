import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getHistoricalPrices, getAssetSector } from '@illumin/lib'
import {
  calculateReturns,
  calculateVolatility,
  calculateBeta,
  calculateMaxDrawdown,
  calculateDrawdownSeries,
  calculateContribution,
  calculateOpportunityCost,
  calculateCorrelation,
  type PricePoint,
} from '@illumin/lib'

export const maxDuration = 60

// Static S&P 500 approximate sector weights (%) as of 2024
const SP500_SECTOR_WEIGHTS: Record<string, number> = {
  Technology: 30,
  Healthcare: 13,
  Financials: 13,
  'Consumer Discretionary': 10,
  Industrials: 8,
  'Communication Services': 9,
  'Consumer Staples': 6,
  Energy: 4,
  Utilities: 2,
  'Real Estate': 2,
  Materials: 2,
}

const INVESTMENT_TYPES = new Set([
  'brokerage', 'investment', '401k', '403b', 'ira', 'roth',
  'roth 401k', '529', 'pension', 'retirement', 'sep ira',
  'simple ira', 'ugma', 'utma', 'keogh',
])

// Security types that represent non-investable positions.
// These are excluded from return calculations and portfolio aggregation.
const NON_INVESTMENT_SECURITY_TYPES = new Set(['cash', 'fixed income'])

export type DisplayCategory = 'investment' | 'cash' | 'fixed_income'

type HoldingMetric = {
  id: string
  ticker: string
  name: string
  type: string
  displayCategory: DisplayCategory
  weight: number
  value: number
  quantity: number
  costBasis: number | null
  sector: string | null
  individualReturn: number
  individualAnnualizedReturn: number
  benchmarkReturn: number | null
  contributionPct: number
  opportunityCostDollars: number
  volatility: number
  beta: number
  returnSource: 'price_history' | 'none'
  priceHistory: { date: string; close: number }[]
}

type UnresolvableHolding = {
  id: string
  ticker: string | null
  name: string
  value: number
  skipReason: 'options_contract' | 'unresolvable_id'
}

// cost_basis fallback disabled -- Plaid sandbox costBasis values
// are per-share prices not total position costs. Re-enable only
// after validating production costBasis data is total position cost.

/**
 * Guard against suspiciously large returns that indicate bad input data.
 * Returns null if the absolute return exceeds 500%.
 */
function guardReturn(value: number, ticker: string): number | null {
  if (Math.abs(value) > 5) {
    console.warn(
      `[portfolio] SUSPICIOUS RETURN: ${ticker} ${(value * 100).toFixed(0)}% -- data likely invalid, reporting none`,
    )
    return null
  }
  return value
}

export async function GET(request: Request) {
  try {
    const result = await requireAuth()
    if ('error' in result) return result.error
    const { user: { dbUser } } = result

    // Fetch all investment accounts with holdings
    const accounts = await prisma.account.findMany({
      where: {
        userId: dbUser.id,
        accountType: { in: [...INVESTMENT_TYPES] },
      },
      include: {
        holdings: { include: { security: true } },
      },
    })

    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') ?? '1y'

    const endDate = new Date()
    const startDate = new Date(endDate)
    switch (period) {
      case 'ytd':
        startDate.setMonth(0, 1)
        startDate.setHours(0, 0, 0, 0)
        break
      case '2y':
        startDate.setFullYear(startDate.getFullYear() - 2)
        break
      case '5y':
        startDate.setFullYear(startDate.getFullYear() - 5)
        break
      case 'all':
        startDate.setFullYear(startDate.getFullYear() - 20)
        break
      case '1y':
      default:
        startDate.setFullYear(startDate.getFullYear() - 1)
        break
    }

    // Flatten all holdings with plaidSecurityId for deduplication
    const rawHoldings = accounts.flatMap((account) =>
      account.holdings.map((h) => ({
        id: h.id,
        plaidSecurityId: h.security.plaidSecurityId,
        ticker: h.security.ticker ?? null,
        name: h.security.name,
        type: h.security.type,
        value: h.value,
        costBasis: h.costBasis ?? null,
        quantity: h.quantity,
        accountName: `${account.institutionName} ${account.accountType}`,
      })),
    )

    // Deduplication by plaidSecurityId -- summing quantities across
    // accounts. Review before production: legitimate multi-account
    // holdings should be summed, not deduplicated.
    const dedupMap = new Map<string, typeof rawHoldings[0]>()
    for (const h of rawHoldings) {
      // Use plaidSecurityId as the dedup key; fall back to name+type if null
      const key = h.plaidSecurityId ?? `${h.name}:${h.type}`
      const existing = dedupMap.get(key)
      if (existing) {
        existing.value += h.value
        existing.quantity += h.quantity
      } else {
        dedupMap.set(key, { ...h })
      }
    }
    const dedupedHoldings = [...dedupMap.values()]

    // Separate non-investable positions (cash, fixed income) from investable holdings.
    // Non-investable positions are excluded from all return and benchmark calculations.
    const investmentHoldings = dedupedHoldings.filter(
      (h) => !NON_INVESTMENT_SECURITY_TYPES.has(h.type),
    )
    const nonInvestmentHoldings = dedupedHoldings.filter(
      (h) => NON_INVESTMENT_SECURITY_TYPES.has(h.type),
    )

    // Collect unique non-null tickers from investment holdings only.
    // ^GSPC is always fetched by getHistoricalPrices regardless of this list.
    const tickers = [
      ...new Set(
        investmentHoldings
          .filter((h) => h.ticker)
          .map((h) => h.ticker as string),
      ),
    ]

    const priceResult = await getHistoricalPrices(tickers, startDate, endDate)
    const { prices: priceMap, benchmarkAvailable, skippedTickers } = priceResult

    // Investment holdings whose tickers were classified as unresolvable
    const unresolvableRaw = investmentHoldings.filter(
      (h) => h.ticker != null && skippedTickers.has(h.ticker),
    )
    // Investment holdings eligible for pricing (have no ticker, or ticker was not skipped)
    const pricingHoldings = investmentHoldings.filter(
      (h) => h.ticker == null || !skippedTickers.has(h.ticker),
    )

    // Fetch sector info only for valid, non-skipped tickers
    const validTickers = tickers.filter((t) => !skippedTickers.has(t))
    const sectors = await Promise.all(
      validTickers.map(async (t) => ({ ticker: t, sector: await getAssetSector(t) })),
    )
    const sectorByTicker = new Map(sectors.map((s) => [s.ticker, s.sector]))

    // Benchmark: fetched independently. Available even when no holdings resolve.
    const benchmarkPrices = priceMap.get('SPY_BENCHMARK') ?? []
    const benchReturns = benchmarkAvailable ? calculateReturns(benchmarkPrices) : null
    const benchReturnValue = benchReturns?.totalReturn ?? null
    const benchAnnualized = benchReturns?.annualizedReturn ?? null

    // Override Plaid's cached holding values with live Yahoo Finance prices
    // when price history is available. This ensures the UI shows current
    // market prices rather than stale Plaid snapshot values.
    const livePricedHoldings = pricingHoldings.map((h) => {
      const prices = h.ticker ? (priceMap.get(h.ticker) ?? []) : []
      if (prices.length >= 2 && h.quantity > 0) {
        const latestClose = prices[prices.length - 1].close
        return { ...h, value: latestClose * h.quantity }
      }
      return h
    })

    // Weight denominator uses investment holdings only.
    // Cash and fixed income are excluded from this denominator so that
    // investment-position weights sum to 1.0 among themselves.
    const investmentTotal = livePricedHoldings.reduce((s, h) => s + h.value, 0)
    const totalPortfolioValue =
      investmentTotal + nonInvestmentHoldings.reduce((s, h) => s + h.value, 0)

    const holdingsWithWeight = livePricedHoldings.map((h) => ({
      ...h,
      weight: investmentTotal > 0 ? h.value / investmentTotal : 0,
    }))

    // Build per-holding metrics. Two tiers only:
    //   1. Yahoo Finance price series -- full metrics
    //   2. No data -- returnSource: 'none', no return shown
    // cost_basis fallback is disabled (see comment above).
    const holdingMetrics: HoldingMetric[] = holdingsWithWeight.map((h) => {
      const prices = h.ticker ? (priceMap.get(h.ticker) ?? []) : []
      const hasPriceHistory = prices.length >= 2

      if (hasPriceHistory) {
        const { totalReturn: rawReturn, annualizedReturn } = calculateReturns(prices)
        const guardedReturn = guardReturn(rawReturn, h.ticker ?? h.name)

        if (guardedReturn === null) {
          // Price series exists but return is implausibly large -- treat as no data
          return {
            id: h.id,
            ticker: h.ticker ?? h.name.slice(0, 6).toUpperCase(),
            name: h.name,
            type: h.type,
            displayCategory: 'investment' as const,
            weight: h.weight,
            value: h.value,
            quantity: h.quantity,
            costBasis: h.costBasis,
            sector: sectorByTicker.get(h.ticker!) ?? null,
            individualReturn: 0,
            individualAnnualizedReturn: 0,
            benchmarkReturn: benchReturnValue,
            contributionPct: 0,
            opportunityCostDollars: 0,
            volatility: 0,
            beta: 1,
            returnSource: 'none' as const,
            priceHistory: [],
          }
        }

        return {
          id: h.id,
          ticker: h.ticker ?? h.name.slice(0, 6).toUpperCase(),
          name: h.name,
          type: h.type,
          displayCategory: 'investment' as const,
          weight: h.weight,
          value: h.value,
          quantity: h.quantity,
          costBasis: h.costBasis,
          sector: sectorByTicker.get(h.ticker!) ?? null,
          individualReturn: guardedReturn,
          individualAnnualizedReturn: annualizedReturn,
          benchmarkReturn: benchReturnValue,
          contributionPct: calculateContribution({ weight: h.weight, return: guardedReturn }),
          opportunityCostDollars: benchmarkAvailable
            ? calculateOpportunityCost(prices, benchmarkPrices, h.value)
            : 0,
          volatility: calculateVolatility(prices),
          beta: calculateBeta(prices, benchmarkPrices),
          returnSource: 'price_history' as const,
          priceHistory: prices.map((p) => ({
            date: p.date.toISOString().slice(0, 10),
            close: p.close,
          })),
        }
      }

      // No price history available
      return {
        id: h.id,
        ticker: h.ticker ?? h.name.slice(0, 6).toUpperCase(),
        name: h.name,
        type: h.type,
        displayCategory: 'investment' as const,
        weight: h.weight,
        value: h.value,
        quantity: h.quantity,
        costBasis: h.costBasis,
        sector: null,
        individualReturn: 0,
        individualAnnualizedReturn: 0,
        benchmarkReturn: benchReturnValue,
        contributionPct: 0,
        opportunityCostDollars: 0,
        volatility: 0,
        beta: 1,
        returnSource: 'none' as const,
        priceHistory: [],
      }
    })

    // Append non-investment (cash, fixed income) holdings to holdingMetrics for UI display.
    // Their weight uses total portfolio value as denominator for "% of portfolio" labeling.
    for (const h of nonInvestmentHoldings) {
      const displayCategory: DisplayCategory = h.type === 'cash' ? 'cash' : 'fixed_income'
      holdingMetrics.push({
        id: h.id,
        ticker: h.ticker ?? h.name.slice(0, 6).toUpperCase(),
        name: h.name,
        type: h.type,
        displayCategory,
        weight: totalPortfolioValue > 0 ? h.value / totalPortfolioValue : 0,
        value: h.value,
        quantity: h.quantity,
        costBasis: null,
        sector: null,
        individualReturn: 0,
        individualAnnualizedReturn: 0,
        benchmarkReturn: null,
        contributionPct: 0,
        opportunityCostDollars: 0,
        volatility: 0,
        beta: 0,
        returnSource: 'none' as const,
        priceHistory: [],
      })
    }

    // Portfolio-level aggregates: only investment holdings with confirmed price history
    const holdingsWithPrices = holdingMetrics.filter(
      (h) => h.returnSource === 'price_history' && h.displayCategory === 'investment',
    )
    const totalWeightWithPrices = holdingsWithPrices.reduce((s, h) => s + h.weight, 0)
    const normalizePrices = totalWeightWithPrices > 0 ? 1 / totalWeightWithPrices : 0

    // portfolioReturn is null when no investment holdings have verified price history.
    // A null return shows "--" in the UI rather than a misleading 0%.
    const portfolioReturn =
      holdingsWithPrices.length > 0
        ? holdingsWithPrices.reduce((s, h) => s + h.weight * h.individualReturn, 0) * normalizePrices
        : null

    const portfolioAnnualizedReturn =
      holdingsWithPrices.length > 0
        ? holdingsWithPrices.reduce(
            (s, h) => s + h.weight * h.individualAnnualizedReturn,
            0,
          ) * normalizePrices
        : null

    const portfolioVolatility =
      holdingsWithPrices.reduce((s, h) => s + h.weight * h.volatility, 0) * normalizePrices

    const portfolioBeta =
      holdingsWithPrices.length > 0
        ? holdingsWithPrices.reduce((s, h) => s + h.weight * h.beta, 0) * normalizePrices
        : 1

    const portfolioSharpe =
      portfolioVolatility > 0 && portfolioAnnualizedReturn !== null
        ? (portfolioAnnualizedReturn - 0.045) / portfolioVolatility
        : 0

    // Drawdown: use the highest-weight investment holding with a real price series
    const largestWithPrices = [...holdingsWithPrices].sort((a, b) => b.weight - a.weight)[0]
    const drawdownPrices = largestWithPrices
      ? (priceMap.get(largestWithPrices.ticker) ?? [])
      : []
    const drawdownSeries = calculateDrawdownSeries(drawdownPrices).map((d) => ({
      date: d.date.toISOString().slice(0, 10),
      drawdown: d.drawdown,
    }))
    const maxDrawdown = calculateMaxDrawdown(drawdownPrices)

    // Sector weights from investment holdings only
    const sectorWeights: Record<string, number> = {}
    for (const h of holdingMetrics.filter((h) => h.displayCategory === 'investment')) {
      const sector = h.sector ?? capitalise(h.type) ?? 'Other'
      sectorWeights[sector] = (sectorWeights[sector] ?? 0) + h.weight * 100
    }

    // Correlation matrix for top 8 investment holdings with real price series
    const topForCorrelation = [...holdingsWithPrices]
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 8)

    const correlationTickers = topForCorrelation.map((h) => h.ticker)
    const correlationMatrix: number[][] = topForCorrelation.map((rowH) =>
      topForCorrelation.map((colH) => {
        if (rowH.ticker === colH.ticker) return 1
        const rowPrices = priceMap.get(rowH.ticker) ?? []
        const colPrices = priceMap.get(colH.ticker) ?? []
        return parseFloat(calculateCorrelation(rowPrices, colPrices).toFixed(2))
      }),
    )

    // Best and worst performers: investment holdings with price history only
    const rankedByVsMarket = benchmarkAvailable
      ? [...holdingsWithPrices].sort(
          (a, b) =>
            (b.individualReturn - (b.benchmarkReturn ?? 0)) -
            (a.individualReturn - (a.benchmarkReturn ?? 0)),
        )
      : [...holdingsWithPrices].sort((a, b) => b.individualReturn - a.individualReturn)

    const bestPerformer = rankedByVsMarket[0] ?? null
    const worstPerformers = [...rankedByVsMarket].reverse().slice(0, 3)

    // Unresolvable holdings for "Other holdings" display section
    const unresolvableHoldings: UnresolvableHolding[] = unresolvableRaw.map((h) => ({
      id: h.id,
      ticker: h.ticker,
      name: h.name,
      value: h.value,
      skipReason: (h.ticker ? skippedTickers.get(h.ticker) : undefined) ?? 'unresolvable_id',
    }))

    return NextResponse.json({
      startDate: startDate.toISOString().slice(0, 10),
      endDate: endDate.toISOString().slice(0, 10),
      totalPortfolioValue,
      portfolioReturn,
      portfolioAnnualizedReturn,
      benchmarkReturn: benchReturnValue,
      benchmarkAnnualizedReturn: benchAnnualized,
      benchmarkAvailable,
      portfolioVolatility,
      portfolioBeta,
      portfolioSharpe,
      maxDrawdown: {
        value: maxDrawdown.maxDrawdown,
        date: maxDrawdown.date.toISOString().slice(0, 10),
      },
      holdingMetrics,
      benchmarkPriceHistory: benchmarkPrices.map((p) => ({
        date: p.date.toISOString().slice(0, 10),
        close: p.close,
      })),
      drawdownSeries,
      sectorWeights,
      sp500SectorWeights: SP500_SECTOR_WEIGHTS,
      correlationMatrix,
      correlationTickers,
      unresolvableHoldings,
      bestPerformer: bestPerformer
        ? {
            ticker: bestPerformer.ticker,
            return: bestPerformer.individualReturn,
            vsMarket: benchmarkAvailable
              ? bestPerformer.individualReturn - (bestPerformer.benchmarkReturn ?? 0)
              : null,
          }
        : null,
      worstPerformers: worstPerformers.map((h) => ({
        ticker: h.ticker,
        name: h.name,
        return: h.individualReturn,
        benchmarkReturn: h.benchmarkReturn,
        vsMarket: benchmarkAvailable
          ? h.individualReturn - (h.benchmarkReturn ?? 0)
          : null,
        opportunityCostDollars: h.opportunityCostDollars,
        value: h.value,
      })),
    })
  } catch (err) {
    console.error('[/api/portfolio/history]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 },
    )
  }
}

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
