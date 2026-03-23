import type { PricePoint } from './priceHistory'
export type { PricePoint }

// ── Internal helpers ──────────────────────────────────────────────────────────

function dailyReturns(prices: PricePoint[]): number[] {
  const returns: number[] = []
  for (let i = 1; i < prices.length; i++) {
    if (prices[i - 1].close > 0) {
      returns.push((prices[i].close - prices[i - 1].close) / prices[i - 1].close)
    }
  }
  return returns
}

function mean(arr: number[]): number {
  return arr.length === 0 ? 0 : arr.reduce((s, v) => s + v, 0) / arr.length
}

/** Align two price series to common dates, returning parallel return arrays. */
function alignedReturns(
  pricesA: PricePoint[],
  pricesB: PricePoint[],
): { returnsA: number[]; returnsB: number[] } {
  const mapA = new Map(pricesA.map((p) => [p.date.toISOString().slice(0, 10), p.close]))
  const mapB = new Map(pricesB.map((p) => [p.date.toISOString().slice(0, 10), p.close]))
  const dates = [...mapA.keys()].filter((d) => mapB.has(d)).sort()

  const returnsA: number[] = []
  const returnsB: number[] = []

  for (let i = 1; i < dates.length; i++) {
    const prevA = mapA.get(dates[i - 1])!
    const currA = mapA.get(dates[i])!
    const prevB = mapB.get(dates[i - 1])!
    const currB = mapB.get(dates[i])!
    if (prevA > 0 && prevB > 0) {
      returnsA.push((currA - prevA) / prevA)
      returnsB.push((currB - prevB) / prevB)
    }
  }

  return { returnsA, returnsB }
}

// ── Exported calculation functions ───────────────────────────────────────────

/**
 * Calculate total and annualized return from a price series.
 * @returns {{ totalReturn: decimal, annualizedReturn: decimal }}
 * Both values are decimals: 0.071 = 7.1%.
 */
export function calculateReturns(
  prices: PricePoint[],
): { totalReturn: number; annualizedReturn: number } {
  if (prices.length < 2) return { totalReturn: 0, annualizedReturn: 0 }
  const first = prices[0].close
  const last = prices[prices.length - 1].close
  if (first === 0) return { totalReturn: 0, annualizedReturn: 0 }

  const totalReturn = (last - first) / first
  const days =
    (prices[prices.length - 1].date.getTime() - prices[0].date.getTime()) /
    (1000 * 60 * 60 * 24)
  const years = Math.max(days / 365.25, 1 / 365.25)
  const annualizedReturn = Math.pow(1 + totalReturn, 1 / years) - 1
  return { totalReturn, annualizedReturn }
}

/**
 * Calculate annualized standard deviation of daily returns.
 * @returns {decimal} annualized volatility (0.18 = 18% annualized volatility)
 */
export function calculateVolatility(prices: PricePoint[]): number {
  const returns = dailyReturns(prices)
  if (returns.length < 2) return 0
  const m = mean(returns)
  const variance =
    returns.reduce((s, r) => s + Math.pow(r - m, 2), 0) / (returns.length - 1)
  return Math.sqrt(variance) * Math.sqrt(252)
}

/**
 * Calculate beta of a holding relative to the benchmark.
 * @returns {ratio} beta (1.0 = moves with market, >1 = more volatile, <1 = less volatile)
 */
export function calculateBeta(
  holdingPrices: PricePoint[],
  benchmarkPrices: PricePoint[],
): number {
  const { returnsA: holdingReturns, returnsB: benchReturns } = alignedReturns(
    holdingPrices,
    benchmarkPrices,
  )
  if (holdingReturns.length < 3) return 1

  const meanH = mean(holdingReturns)
  const meanB = mean(benchReturns)

  let covariance = 0
  let benchVariance = 0
  for (let i = 0; i < holdingReturns.length; i++) {
    covariance += (holdingReturns[i] - meanH) * (benchReturns[i] - meanB)
    benchVariance += Math.pow(benchReturns[i] - meanB, 2)
  }

  return benchVariance === 0 ? 1 : covariance / benchVariance
}

/**
 * Calculate the Sharpe ratio (annualized excess return over annualized volatility).
 * @param riskFreeRate decimal annual rate, defaults to 0.045 (approximate T-bill rate)
 * @returns {ratio} Sharpe ratio
 */
export function calculateSharpe(prices: PricePoint[], riskFreeRate = 0.045): number {
  const { annualizedReturn } = calculateReturns(prices)
  const vol = calculateVolatility(prices)
  if (vol === 0) return 0
  return (annualizedReturn - riskFreeRate) / vol
}

/**
 * Calculate the drawdown at each date in the price series.
 * @returns drawdown series where 0 = at peak, -0.14 = 14% below peak
 * @returns {{ date: Date, drawdown: decimal }[]}
 */
export function calculateDrawdownSeries(
  prices: PricePoint[],
): { date: Date; drawdown: number }[] {
  if (prices.length === 0) return []
  let peak = prices[0].close
  return prices.map((p) => {
    if (p.close > peak) peak = p.close
    const drawdown = peak > 0 ? (p.close - peak) / peak : 0
    return { date: p.date, drawdown }
  })
}

/**
 * Calculate the maximum drawdown across the entire price series.
 * @returns {{ maxDrawdown: decimal, date: Date }} maxDrawdown is negative (e.g., -0.22 = 22% drawdown)
 */
export function calculateMaxDrawdown(
  prices: PricePoint[],
): { maxDrawdown: number; date: Date } {
  const series = calculateDrawdownSeries(prices)
  if (series.length === 0) return { maxDrawdown: 0, date: new Date() }
  let worst = series[0]
  for (const entry of series) {
    if (entry.drawdown < worst.drawdown) worst = entry
  }
  return { maxDrawdown: worst.drawdown, date: worst.date }
}

/**
 * Calculate how much a holding contributed to total portfolio return.
 * @param holding.weight decimal portfolio weight (0.15 = 15%)
 * @param holding.return decimal holding return (0.071 = 7.1%)
 * @returns {decimal} contribution in percentage points (e.g., 0.0107 = ~1.07 pp)
 */
export function calculateContribution(holding: { weight: number; return: number }): number {
  return holding.weight * holding.return
}

/**
 * Calculate the estimated dollar opportunity cost of a holding vs the benchmark.
 * Compares what the position is worth now to what it would be worth had it matched
 * the benchmark return over the same holding period, starting from the same cost basis.
 * Positive = holding outperformed (no drag). Negative = holding underperformed (drag).
 *
 * @param currentValue dollars
 * @returns {dollars} current value minus benchmark-equivalent value on the same starting capital.
 *   Use the absolute value when showing "drag" to the user.
 */
export function calculateOpportunityCost(
  holdingPrices: PricePoint[],
  benchmarkPrices: PricePoint[],
  currentValue: number,
): number {
  if (holdingPrices.length < 2 || benchmarkPrices.length < 2) return 0

  const { totalReturn: holdingReturn } = calculateReturns(holdingPrices)

  // Find benchmark price at the same start date as the holding
  const holdingStartStr = holdingPrices[0].date.toISOString().slice(0, 10)
  const benchmarkMap = new Map(
    benchmarkPrices.map((p) => [p.date.toISOString().slice(0, 10), p.close]),
  )

  // Use the closest benchmark date at or after the holding start
  const sortedBenchDates = [...benchmarkMap.keys()].sort()
  const benchStartDate =
    sortedBenchDates.find((d) => d >= holdingStartStr) ?? sortedBenchDates[0]
  const benchStartClose = benchmarkMap.get(benchStartDate)
  if (!benchStartClose || benchStartClose === 0) return 0

  const benchEndClose = benchmarkPrices[benchmarkPrices.length - 1].close
  const benchmarkReturn = (benchEndClose - benchStartClose) / benchStartClose

  // Back-calculate cost basis from current value and holding return
  const costBasis = holdingReturn !== -1 ? currentValue / (1 + holdingReturn) : currentValue
  const benchmarkEquivalentValue = costBasis * (1 + benchmarkReturn)

  return currentValue - benchmarkEquivalentValue
}

/**
 * Calculate Pearson correlation coefficient between the daily returns of two price series.
 * @returns {ratio} correlation coefficient between -1 and 1 (0 = no correlation, 1 = perfect positive)
 */
export function calculateCorrelation(pricesA: PricePoint[], pricesB: PricePoint[]): number {
  const { returnsA, returnsB } = alignedReturns(pricesA, pricesB)
  if (returnsA.length < 3) return 0

  const meanA = mean(returnsA)
  const meanB = mean(returnsB)

  let cov = 0
  let varA = 0
  let varB = 0
  for (let i = 0; i < returnsA.length; i++) {
    cov += (returnsA[i] - meanA) * (returnsB[i] - meanB)
    varA += Math.pow(returnsA[i] - meanA, 2)
    varB += Math.pow(returnsB[i] - meanB, 2)
  }

  const denom = Math.sqrt(varA * varB)
  return denom === 0 ? 0 : cov / denom
}
