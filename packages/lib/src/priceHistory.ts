import YahooFinance from 'yahoo-finance2'

const yahooFinance = new YahooFinance({ suppressNotices: ['ripHistorical'] })

export interface PricePoint {
  date: Date
  close: number
}

export type SkipReason = 'options_contract' | 'unresolvable_id'

export interface PriceHistoryResult {
  prices: Map<string, PricePoint[]>
  benchmarkAvailable: boolean
  skippedTickers: Map<string, SkipReason>
}

// Module-level cache keyed by ticker:startDate:endDate
const priceCache = new Map<string, PricePoint[]>()
const sectorCache = new Map<string, string | null>()

function cacheKey(ticker: string, startDate: Date, endDate: Date): string {
  return `${ticker}:${startDate.toISOString().slice(0, 10)}:${endDate.toISOString().slice(0, 10)}`
}

type TickerClass = 'valid' | 'normalize_btc' | 'normalize_eth' | 'mutual_fund' | SkipReason

function classifyTicker(ticker: string): TickerClass {
  // Options contracts and internal fund IDs: contain 6+ consecutive digits
  if (/\d{6,}/.test(ticker)) return 'options_contract'
  // Crypto normalizations
  if (ticker === 'BTC') return 'normalize_btc'
  if (ticker === 'ETH') return 'normalize_eth'
  // Pure numbers (no letters at all)
  if (!/[A-Za-z]/.test(ticker)) return 'unresolvable_id'
  // Starts with a digit
  if (/^\d/.test(ticker)) return 'unresolvable_id'
  // Mutual fund: exactly 5 letters ending in X (e.g. MIPTX, CAMYX, DBLTX)
  if (/^[A-Za-z]{5}$/.test(ticker) && ticker.toUpperCase().endsWith('X')) return 'mutual_fund'
  return 'valid'
}

/**
 * Fetch end-of-day closing prices for each ticker over the given date range.
 *
 * Validation and normalization applied before any fetch:
 * - Options contracts (6+ digit sequences) and unresolvable IDs are skipped.
 * - BTC normalizes to BTC-USD; ETH normalizes to ETH-USD.
 * - Mutual fund tickers (5 letters ending in X) are attempted silently.
 * - Results for skipped tickers are omitted from the price map.
 *
 * The S&P 500 benchmark (^GSPC) is fetched separately and treated as critical
 * infrastructure. If it fails, benchmarkAvailable is false and all
 * market-comparison metrics must show "--" in the UI.
 *
 * Results are stored under the original ticker key (not the normalized form).
 * Prices are cached in memory.
 */
export async function getHistoricalPrices(
  tickers: string[],
  startDate: Date,
  endDate: Date,
): Promise<PriceHistoryResult> {
  // Clamp endDate to yesterday to avoid incomplete intraday rows
  // where close is null (market still open), which causes yahoo-finance2 to throw.
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  yesterday.setHours(23, 59, 59, 999)
  if (endDate > yesterday) {
    endDate = yesterday
  }

  const skippedTickers = new Map<string, SkipReason>()

  // Classify and normalize each ticker
  type FetchEntry = { original: string; resolved: string; isMutualFund: boolean }
  const toFetch: FetchEntry[] = []

  for (const ticker of [...new Set(tickers)]) {
    const cls = classifyTicker(ticker)
    if (cls === 'options_contract' || cls === 'unresolvable_id') {
      skippedTickers.set(ticker, cls)
      continue
    }
    let resolved = ticker
    if (cls === 'normalize_btc') resolved = 'BTC-USD'
    if (cls === 'normalize_eth') resolved = 'ETH-USD'
    toFetch.push({ original: ticker, resolved, isMutualFund: cls === 'mutual_fund' })
  }

  const result = new Map<string, PricePoint[]>()
  let benchmarkAvailable = false

  // Benchmark fetch: treated as critical. A failure disables all market comparison metrics.
  const benchKey = cacheKey('^GSPC', startDate, endDate)
  if (priceCache.has(benchKey)) {
    const cached = priceCache.get(benchKey)!
    result.set('SPY_BENCHMARK', cached)
    benchmarkAvailable = cached.length >= 2
  } else {
    try {
      const rows = await yahooFinance.historical(
        '^GSPC',
        { period1: startDate, period2: endDate, interval: '1d' },
        { validateResult: false as const },
      )
      const prices: PricePoint[] = (rows as Array<{ date: Date; close: number }>)
        .filter((r) => r.close != null && r.close > 0)
        .map((r) => ({ date: r.date, close: r.close }))
        .sort((a, b) => a.date.getTime() - b.date.getTime())

      result.set('SPY_BENCHMARK', prices)
      if (prices.length >= 2) {
        priceCache.set(benchKey, prices)
        benchmarkAvailable = true
      } else {
        console.error('BENCHMARK FETCH FAILED — all market comparison metrics will be unavailable')
      }
    } catch (err) {
      console.error('BENCHMARK FETCH FAILED — all market comparison metrics will be unavailable', err)
      result.set('SPY_BENCHMARK', [])
    }
  }

  // Fetch user tickers in parallel. Results stored under the original ticker key.
  await Promise.all(
    toFetch.map(async ({ original, resolved, isMutualFund }) => {
      const key = cacheKey(resolved, startDate, endDate)
      if (priceCache.has(key)) {
        result.set(original, priceCache.get(key)!)
        return
      }

      try {
        const rows = await yahooFinance.historical(
          resolved,
          { period1: startDate, period2: endDate, interval: '1d' },
          { validateResult: false as const },
        )
        const prices: PricePoint[] = (rows as Array<{ date: Date; close: number }>)
          .filter((r) => r.close != null && r.close > 0)
          .map((r) => ({ date: r.date, close: r.close }))
          .sort((a, b) => a.date.getTime() - b.date.getTime())

        priceCache.set(key, prices)
        result.set(original, prices)
      } catch (err) {
        if (!isMutualFund) {
          console.error(`[priceHistory] Failed to fetch ${resolved}:`, err)
        }
        result.set(original, [])
      }
    }),
  )

  return { prices: result, benchmarkAvailable, skippedTickers }
}

/**
 * Fetch the sector for a given ticker using Yahoo Finance quote summary.
 * Returns null if the ticker has no sector info or the request fails.
 * Results are cached in memory.
 */
export async function getAssetSector(ticker: string): Promise<string | null> {
  if (sectorCache.has(ticker)) return sectorCache.get(ticker)!

  try {
    const summary = await yahooFinance.quoteSummary(
      ticker,
      { modules: ['assetProfile'] },
      { validateResult: false as const },
    )
    const sector = (summary as { assetProfile?: { sector?: string } })?.assetProfile?.sector ?? null
    sectorCache.set(ticker, sector)
    return sector
  } catch {
    sectorCache.set(ticker, null)
    return null
  }
}
