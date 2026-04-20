'use client'

import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { usePortfolioHistoryQuery } from '@/lib/queries'
import { useIsMobile } from '@/hooks/useIsMobile'
import MobileCard from '@/components/ui/MobileCard'
import MobileMetricCard from '@/components/ui/MobileMetricCard'
import { colors, fonts, spacing } from '@/lib/theme'

// ── Types ─────────────────────────────────────────────────────────────────────

interface HoldingMetric {
  id: string
  ticker: string
  name: string
  type: string
  displayCategory: 'investment' | 'cash' | 'fixed_income'
  weight: number
  value: number
  quantity: number
  costBasis: number | null
  sector: string | null
  individualReturn: number
  benchmarkReturn: number | null
  contributionPct: number
  opportunityCostDollars: number
  volatility: number
  beta: number
  returnSource: 'price_history' | 'none'
  priceHistory: { date: string; close: number }[]
}

interface WorstPerformer {
  ticker: string
  name: string
  return: number
  benchmarkReturn: number | null
  vsMarket: number | null
  opportunityCostDollars: number
  value: number
}

interface UnresolvableHolding {
  id: string
  ticker: string | null
  name: string
  value: number
  skipReason: 'options_contract' | 'unresolvable_id'
}

interface HistoryData {
  totalPortfolioValue: number
  portfolioReturn: number | null
  portfolioAnnualizedReturn: number | null
  benchmarkReturn: number | null
  benchmarkAvailable: boolean
  holdingMetrics: HoldingMetric[]
  worstPerformers: WorstPerformer[]
  bestPerformer: { ticker: string; return: number; vsMarket: number | null } | null
  unresolvableHoldings: UnresolvableHolding[]
}

// ── Formatters ────────────────────────────────────────────────────────────────

function fmtDollars(n: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n)
}

function fmtPct(n: number, showSign = false) {
  const sign = showSign && n > 0 ? '+' : ''
  return `${sign}${(n * 100).toFixed(1)}%`
}

function fmtPrice(n: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)
}

function fmtShares(n: number) {
  if (Number.isInteger(n)) return n.toLocaleString('en-US')
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })
}

// ── Shared style tokens ───────────────────────────────────────────────────────

const card: React.CSSProperties = {
  backgroundColor: 'var(--color-surface)',
  border: '1px solid var(--color-gold-border)',
  borderRadius: '2px',
  padding: '28px',
}

const label: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '10px',
  color: 'var(--color-text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.16em',
  marginBottom: '10px',
  display: 'block',
}

// ── Heatmap tile color ────────────────────────────────────────────────────────

function heatmapColor(vsMarket: number | null): string {
  if (vsMarket === null) return 'var(--color-surface-texture)'
  if (vsMarket > 0.05) return 'color-mix(in srgb, var(--color-positive) 35%, transparent)'
  if (vsMarket > 0.02) return 'color-mix(in srgb, var(--color-positive) 18%, transparent)'
  if (vsMarket > -0.02) return 'var(--color-surface-texture)'
  if (vsMarket > -0.05) return 'color-mix(in srgb, var(--color-negative) 18%, transparent)'
  return 'color-mix(in srgb, var(--color-negative) 35%, transparent)'
}

function heatmapBorder(vsMarket: number | null): string {
  if (vsMarket === null) return 'var(--color-border)'
  if (vsMarket > 0.02) return 'var(--color-positive-border)'
  if (vsMarket < -0.02) return 'var(--color-negative-border)'
  return 'var(--color-border)'
}

// ── Time Period Selector ──────────────────────────────────────────────────────

type Period = 'ytd' | '1y' | '2y' | '5y' | 'all'

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: 'ytd', label: 'YTD' },
  { value: '1y', label: '1Y' },
  { value: '2y', label: '2Y' },
  { value: '5y', label: '5Y' },
  { value: 'all', label: 'All' },
]

function PeriodSelector({
  value,
  onChange,
  loading,
}: {
  value: Period
  onChange: (p: Period) => void
  loading: boolean
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      {PERIOD_OPTIONS.map((opt) => {
        const active = opt.value === value
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            disabled={loading && !active}
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              letterSpacing: '0.10em',
              padding: '5px 12px',
              borderRadius: 'var(--radius-sm)',
              cursor: loading && !active ? 'default' : 'pointer',
              border: active ? '1px solid var(--color-gold)' : '1px solid var(--color-border)',
              backgroundColor: active ? 'var(--color-gold)' : 'transparent',
              color: active ? 'var(--color-bg)' : 'var(--color-text-muted)',
              opacity: loading && !active ? 0.4 : 1,
              transition: 'border-color 150ms ease, background-color 150ms ease, color 150ms ease',
            }}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

// ── Metric Cards Row ──────────────────────────────────────────────────────────

function MetricCards({ data }: { data: HistoryData }) {
  const totalOppCostDollars = data.holdingMetrics.reduce(
    (s, h) => s + h.opportunityCostDollars,
    0,
  )
  const isExcessReturn = totalOppCostDollars > 0
  const hasOppData = totalOppCostDollars !== 0

  // Benchmark comparison is only shown when benchmark data is available
  // and the benchmark return is non-zero (zero indicates a data failure).
  const benchmarkValid =
    data.benchmarkAvailable &&
    data.benchmarkReturn !== null &&
    data.benchmarkReturn !== 0

  const portfolioVsBenchmark =
    benchmarkValid && data.benchmarkReturn !== null && data.portfolioReturn !== null
      ? data.portfolioReturn - data.benchmarkReturn
      : null

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
      {/* 1. Total portfolio value */}
      <div style={card}>
        <span style={label}>Portfolio Value</span>
        <p style={{
          fontFamily: 'var(--font-display)',
          fontSize: '26px',
          color: 'var(--color-positive)',
          fontWeight: 400,
        }}>
          {fmtDollars(data.totalPortfolioValue)}
        </p>
      </div>

      {/* 2. Return vs market */}
      <div style={card}>
        <span style={label}>Return vs Market</span>
        <p style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '13px',
          color: 'var(--color-text-muted)',
          marginBottom: '4px',
        }}>
          Your return:{' '}
          <span style={{
            fontFamily: 'var(--font-display)',
            fontSize: '18px',
            color: data.portfolioReturn === null
              ? 'var(--color-text-muted)'
              : data.portfolioReturn >= 0 ? 'var(--color-positive)' : 'var(--color-negative)',
          }}>
            {data.portfolioReturn !== null ? fmtPct(data.portfolioReturn, true) : '--'}
          </span>
        </p>
        <p style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '13px',
          color: 'var(--color-text-muted)',
        }}>
          Market return:{' '}
          <span style={{
            fontFamily: 'var(--font-display)',
            fontSize: '18px',
            color: benchmarkValid && data.benchmarkReturn! >= 0
              ? 'var(--color-positive)'
              : benchmarkValid
              ? 'var(--color-negative)'
              : 'var(--color-text-muted)',
          }}>
            {benchmarkValid ? fmtPct(data.benchmarkReturn!, true) : '--'}
          </span>
        </p>
        <p style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '10px',
          color: portfolioVsBenchmark !== null
            ? (portfolioVsBenchmark >= 0 ? 'var(--color-positive)' : 'var(--color-negative)')
            : 'var(--color-text-muted)',
          marginTop: '6px',
          letterSpacing: '0.06em',
        }}>
          {portfolioVsBenchmark !== null
            ? `${portfolioVsBenchmark >= 0 ? 'Outperforming' : 'Underperforming'} by ${fmtPct(Math.abs(portfolioVsBenchmark))}`
            : '--'}
        </p>
      </div>

      {/* 3. Best performer */}
      <div style={card}>
        <span style={label}>Best Performer</span>
        {data.bestPerformer ? (
          <>
            <p style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '20px',
              color: 'var(--color-gold)',
              letterSpacing: '0.04em',
              marginBottom: '4px',
            }}>
              {data.bestPerformer.ticker}
            </p>
            <p style={{
              fontFamily: 'var(--font-display)',
              fontSize: '22px',
              color: 'var(--color-positive)',
            }}>
              {fmtPct(data.bestPerformer.return, true)}
            </p>
          </>
        ) : (
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', color: 'var(--color-text-muted)' }}>
            No data
          </p>
        )}
      </div>

      {/* 4. Opportunity cost / excess return */}
      <div style={{ ...card, position: 'relative' }}>
        <span style={label}>{isExcessReturn ? 'Excess Return' : 'Estimated Drag'}</span>
        <p style={{
          fontFamily: 'var(--font-display)',
          fontSize: '22px',
          color: isExcessReturn ? 'var(--color-positive)' : hasOppData ? 'var(--color-negative)' : 'var(--color-text-muted)',
          fontWeight: 400,
        }}>
          {hasOppData ? fmtDollars(Math.abs(totalOppCostDollars)) : '--'}
        </p>
        <p style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '10px',
          color: 'var(--color-text-muted)',
          lineHeight: 1.5,
          marginTop: '6px',
        }}>
          {isExcessReturn
            ? 'Estimated gain from outperforming positions'
            : 'Estimated drag from underperforming positions'}
        </p>
        <DragTooltip />
      </div>
    </div>
  )
}

function DragTooltip() {
  const [visible, setVisible] = useState(false)
  return (
    <div
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      style={{
        position: 'absolute',
        top: '14px',
        right: '14px',
        width: '16px',
        height: '16px',
        borderRadius: '50%',
        border: '1px solid var(--color-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'default',
        fontFamily: 'var(--font-mono)',
        fontSize: '9px',
        color: 'var(--color-text-muted)',
      }}
    >
      ?
      {visible && (
        <div style={{
          position: 'absolute',
          top: '24px',
          right: 0,
          width: '260px',
          backgroundColor: 'var(--color-surface-2)',
          border: '1px solid var(--color-border)',
          borderRadius: '2px',
          padding: '12px',
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          color: 'var(--color-text-mid)',
          lineHeight: 1.6,
          zIndex: 10,
        }}>
          This is the estimated dollar difference between your current position values
          and what they would be worth had they matched the total market return over the same
          holding period. Calculated on the same starting dollar value, not a percentage comparison.
        </div>
      )}
    </div>
  )
}

// ── Heatmap helpers ───────────────────────────────────────────────────────────

function getTileSpan(weight: number): number {
  if (weight >= 0.50) return 6
  if (weight >= 0.35) return 5
  if (weight >= 0.20) return 4
  if (weight >= 0.10) return 3
  if (weight >= 0.05) return 2
  return 1
}

// ── Holdings Heatmap ──────────────────────────────────────────────────────────

function HoldingsHeatmap({
  holdings,
  benchmarkAvailable,
}: {
  holdings: HoldingMetric[]
  benchmarkAvailable: boolean
}) {
  // Separate investment holdings (have or could have price history) from cash/fixed income
  const investmentHoldings = holdings.filter((h) => h.displayCategory === 'investment')
  const nonInvestmentHoldings = holdings.filter(
    (h) => h.displayCategory === 'cash' || h.displayCategory === 'fixed_income',
  )

  // Weights for heatmap tile sizing are investment-only so investment tiles fill the full heatmap
  const investmentTotal = investmentHoldings.reduce((s, h) => s + h.value, 0)

  const investmentWithWeight = investmentHoldings.map((h) => ({
    ...h,
    heatmapWeight: investmentTotal > 0 ? h.value / investmentTotal : 0,
  }))

  const sortedInvestment = [...investmentWithWeight].sort((a, b) => b.heatmapWeight - a.heatmapWeight)

  // Non-investment tiles are rendered at the end with fixed span=1
  const allTiles = [
    ...sortedInvestment,
    ...nonInvestmentHoldings.map((h) => ({ ...h, heatmapWeight: 0 })),
  ]

  return (
    <div style={card}>
      <span style={label}>Holdings Heatmap</span>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(6, 1fr)',
        gap: '8px',
        marginBottom: '12px',
      }}>
        {allTiles.map((h) => {
          const isNonInvestment =
            h.displayCategory === 'cash' || h.displayCategory === 'fixed_income'
          const isNoData = h.returnSource === 'none' && !isNonInvestment

          const vsMarket =
            !isNonInvestment &&
            benchmarkAvailable &&
            h.benchmarkReturn !== null &&
            h.benchmarkReturn !== 0 &&
            h.returnSource === 'price_history'
              ? h.individualReturn - h.benchmarkReturn
              : null

          const span = isNonInvestment ? 1 : getTileSpan(h.heatmapWeight)
          const isSmall = isNonInvestment || h.heatmapWeight < 0.03

          const bgColor = isNonInvestment || isNoData
            ? 'var(--color-surface-texture)'
            : heatmapColor(vsMarket)
          const borderColor = isNonInvestment || isNoData
            ? 'var(--color-border)'
            : heatmapBorder(vsMarket)

          const displayLabel = isNonInvestment
            ? (h.displayCategory === 'cash' ? 'Cash' : 'Fixed income')
            : (h.name && h.name.trim() ? h.name : h.ticker)

          return (
            <div
              key={h.id}
              style={{
                gridColumn: `span ${span}`,
                backgroundColor: bgColor,
                border: `1px solid ${borderColor}`,
                borderRadius: '2px',
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                minWidth: 0,
                overflow: 'hidden',
              }}
            >
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: isSmall ? '10px' : '13px',
                color: isNonInvestment ? 'var(--color-text-muted)' : 'var(--color-text)',
                fontWeight: 500,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
                {displayLabel}
              </span>
              {!isNonInvestment && h.name && h.name.trim() && (
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: isSmall ? '9px' : '11px',
                  color: 'var(--color-text-muted)',
                  fontStyle: 'italic',
                }}>
                  {h.ticker}
                </span>
              )}
              {!isNonInvestment && (
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: isSmall ? '9px' : '11px',
                  color: vsMarket !== null
                    ? (vsMarket >= 0 ? 'var(--color-positive)' : 'var(--color-negative)')
                    : 'var(--color-text-muted)',
                }}>
                  {vsMarket !== null ? `${fmtPct(vsMarket, true)} vs market` : '--'}
                </span>
              )}
              {!isNonInvestment && (
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: isSmall ? '9px' : '10px',
                  color: 'var(--color-text-muted)',
                }}>
                  {(h.heatmapWeight * 100).toFixed(1)}% of investments
                </span>
              )}
            </div>
          )
        })}
      </div>
      <p style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '10px',
        color: 'var(--color-text-muted)',
        letterSpacing: '0.06em',
      }}>
        Colors show performance relative to S&P 500 return over the same period. Tile size reflects weight among investment holdings.
      </p>
    </div>
  )
}

// ── Opportunity Cost Callout ──────────────────────────────────────────────────

function OpportunityCostCallout({ worstPerformers }: { worstPerformers: WorstPerformer[] }) {
  const filtered = worstPerformers.filter((p) => p.vsMarket !== null && p.vsMarket < -0.01)
  if (filtered.length === 0) return null

  return (
    <div style={{
      ...card,
      borderLeft: '3px solid var(--color-negative)',
      paddingLeft: '24px',
    }}>
      <span style={label}>Relative Underperformance</span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        {filtered.map((p) => (
          <div key={p.ticker}>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '13px',
              color: 'var(--color-gold)',
              letterSpacing: '0.04em',
            }}>
              {p.ticker}
            </span>
            <p style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              color: 'var(--color-text-mid)',
              lineHeight: 1.6,
              marginTop: '4px',
            }}>
              {p.ticker} has underperformed the market by {fmtPct(Math.abs(p.vsMarket!))} over this period.
            </p>
            {p.opportunityCostDollars < 0 && (
              <p style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
                color: 'var(--color-text-mid)',
                lineHeight: 1.6,
              }}>
                On your current position, that represents an estimated{' '}
                <span style={{ color: 'var(--color-negative)' }}>
                  {fmtDollars(Math.abs(p.opportunityCostDollars))}
                </span>{' '}
                in relative underperformance versus a total market index.
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Holdings List Table ───────────────────────────────────────────────────────

function ReturnCell({ holding }: { holding: HoldingMetric }) {
  const [showTip, setShowTip] = useState(false)

  if (holding.returnSource === 'none') {
    return (
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--color-text-muted)' }}>
        --
      </span>
    )
  }

  const currentPrice = holding.quantity > 0 ? holding.value / holding.quantity : null
  const startPrice =
    holding.priceHistory.length >= 2 ? holding.priceHistory[0].close : null

  return (
    <span
      onMouseEnter={() => setShowTip(true)}
      onMouseLeave={() => setShowTip(false)}
      style={{ position: 'relative', display: 'inline-block', cursor: 'default' }}
    >
      <span style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '13px',
        color: holding.individualReturn >= 0 ? 'var(--color-positive)' : 'var(--color-negative)',
      }}>
        {fmtPct(holding.individualReturn, true)}
      </span>
      <span style={{
        position: 'absolute',
        bottom: '-2px',
        left: 0,
        right: 0,
        height: 0,
        borderBottom: '1px dotted rgba(184,145,58,0.5)',
      }} />
      {showTip && (
        <div style={{
          position: 'absolute',
          bottom: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          marginBottom: '8px',
          backgroundColor: 'var(--color-surface-2)',
          border: '1px solid var(--color-border)',
          borderRadius: '2px',
          padding: '10px 14px',
          whiteSpace: 'nowrap',
          zIndex: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: '5px',
        }}>
          {startPrice !== null && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--color-text-mid)' }}>
              Period start: {fmtPrice(startPrice)}/share
            </span>
          )}
          {currentPrice !== null && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--color-text-mid)' }}>
              Current price: {fmtPrice(currentPrice)}
            </span>
          )}
          {startPrice === null && currentPrice === null && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--color-text-muted)' }}>
              No price data
            </span>
          )}
        </div>
      )}
    </span>
  )
}

function HoldingsList({ holdings }: { holdings: HoldingMetric[] }) {
  const sorted = [...holdings].sort((a, b) => b.value - a.value)

  return (
    <div style={card}>
      <span style={label}>Holdings</span>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {['Ticker', 'Name', 'Current Value', 'Return', 'Shares'].map((h) => (
              <th
                key={h}
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '10px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  color: 'var(--color-text-muted)',
                  textAlign: 'left',
                  paddingBottom: '12px',
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((h) => (
            <tr key={h.id} style={{ borderTop: '1px solid var(--color-border)' }}>
              <td style={{ padding: '12px 16px 12px 0' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--color-gold)' }}>
                  {h.ticker}
                </span>
              </td>
              <td style={{ padding: '12px 16px 12px 0' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--color-text-muted)' }}>
                  {h.name}
                </span>
              </td>
              <td style={{ padding: '12px 16px 12px 0' }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '14px', color: 'var(--color-text)' }}>
                  {fmtDollars(h.value)}
                </span>
              </td>
              <td style={{ padding: '12px 16px 12px 0' }}>
                <ReturnCell holding={h} />
              </td>
              <td style={{ padding: '12px 0' }}>
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '13px',
                  color: 'var(--color-text)',
                }}>
                  {h.quantity > 0 ? fmtShares(h.quantity) : '--'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Other Holdings (unresolvable) ─────────────────────────────────────────────

function OtherHoldings({ holdings }: { holdings: UnresolvableHolding[] }) {
  if (holdings.length === 0) return null

  const hasOptions = holdings.some((h) => h.skipReason === 'options_contract')

  return (
    <div style={{
      ...card,
      borderLeft: '3px solid var(--color-border)',
      paddingLeft: '24px',
    }}>
      <span style={label}>Other Holdings</span>
      <p style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '11px',
        color: 'var(--color-text-muted)',
        marginBottom: '16px',
        lineHeight: 1.6,
      }}>
        These positions could not be priced. Return calculations are not available.
      </p>
      {hasOptions && (
        <p style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          color: 'var(--color-text-muted)',
          marginBottom: '16px',
          lineHeight: 1.6,
        }}>
          Options and derivatives are not included in portfolio return calculations.
        </p>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
        {holdings.map((h) => (
          <div
            key={h.id}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '10px 0',
              borderTop: '1px solid var(--color-border)',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '13px',
                color: 'var(--color-text)',
              }}>
                {h.name && h.name.trim() ? h.name : (h.ticker ?? 'Unknown')}
              </span>
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                color: 'var(--color-text-muted)',
                letterSpacing: '0.06em',
              }}>
                No price history available
              </span>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{
                fontFamily: 'var(--font-display)',
                fontSize: '14px',
                color: 'var(--color-text-muted)',
              }}>
                {h.value > 0 ? fmtDollars(h.value) : '--'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Desktop Page ──────────────────────────────────────────────────────────────

function PortfolioDesktop() {
  const [period, setPeriod] = useState<Period>('1y')
  const { data: historyData, isLoading: historyLoading, isError: historyError } =
    usePortfolioHistoryQuery<HistoryData>(period)

  const handlePeriodChange = useCallback((p: Period) => {
    setPeriod(p)
  }, [])

  if (historyLoading && !historyData) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '320px' }}>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', color: 'var(--color-text-muted)', letterSpacing: '0.06em' }}>
          Loading portfolio data...
        </p>
      </div>
    )
  }

  if (historyError && !historyData) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', minHeight: '400px', gap: '20px', textAlign: 'center',
        }}
      >
        <p style={{ fontFamily: 'var(--font-display)', fontSize: '26px', color: 'var(--color-text)' }}>
          No price data available
        </p>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', color: 'var(--color-text-muted)', lineHeight: 1.7 }}>
          Connect a brokerage account with holdings to see portfolio performance.
        </p>
        <Link
          href="/dashboard/accounts"
          style={{
            padding: '10px 24px',
            backgroundColor: 'var(--color-gold)',
            border: 'none', borderRadius: '2px',
            color: 'var(--color-surface)',
            fontFamily: 'var(--font-mono)', fontSize: '13px', letterSpacing: '0.08em',
            textDecoration: 'none', display: 'inline-block',
          }}
        >
          Connect an Account
        </Link>
      </motion.div>
    )
  }

  if (!historyData || historyData.holdingMetrics.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', minHeight: '400px', gap: '20px', textAlign: 'center',
        }}
      >
        <p style={{ fontFamily: 'var(--font-display)', fontSize: '26px', color: 'var(--color-text)' }}>
          No price data available
        </p>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', color: 'var(--color-text-muted)', lineHeight: 1.7 }}>
          Connect a brokerage account with holdings to see portfolio performance.
        </p>
        <Link
          href="/dashboard/accounts"
          style={{
            padding: '10px 24px',
            backgroundColor: 'var(--color-gold)',
            border: 'none', borderRadius: '2px',
            color: 'var(--color-surface)',
            fontFamily: 'var(--font-mono)', fontSize: '13px', letterSpacing: '0.08em',
            textDecoration: 'none', display: 'inline-block',
          }}
        >
          Connect an Account
        </Link>
      </motion.div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', opacity: historyLoading ? 0.5 : 1, transition: 'opacity 200ms ease' }}>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut', delay: 0 }}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
      >
        <span style={{
          fontFamily: 'var(--font-display)',
          fontSize: '22px',
          color: 'var(--color-text)',
          fontWeight: 400,
        }}>
          Portfolio
        </span>
        <PeriodSelector value={period} onChange={handlePeriodChange} loading={historyLoading} />
      </motion.div>

      {/* Advanced analytics CTA */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut', delay: 0.03 }}
      >
        <Link
          href="/dashboard/portfolio/analytics"
          style={{ textDecoration: 'none', display: 'block' }}
        >
          <motion.div
            whileHover={{ borderColor: 'var(--color-gold)', y: -2 }}
            transition={{ duration: 0.15 }}
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-gold-border)',
              borderRadius: '2px',
              padding: '16px 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              transition: 'border-color 150ms ease, box-shadow 150ms ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <span style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '16px',
                fontWeight: 400,
                color: 'var(--color-text)',
              }}>
                Advanced Analytics
              </span>
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                color: 'var(--color-text-muted)',
                letterSpacing: '0.04em',
              }}>
                Risk, sector exposure, beta, concentration
              </span>
            </div>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '16px',
              color: 'var(--color-gold)',
              flexShrink: 0,
            }}>
              &#x2192;
            </span>
          </motion.div>
        </Link>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: 'easeOut', delay: 0.06 }}>
        <MetricCards data={historyData} />
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: 'easeOut', delay: 0.12 }}>
        <HoldingsHeatmap
          holdings={historyData.holdingMetrics}
          benchmarkAvailable={historyData.benchmarkAvailable}
        />
      </motion.div>

      {historyData.worstPerformers.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: 'easeOut', delay: 0.18 }}>
          <OpportunityCostCallout worstPerformers={historyData.worstPerformers} />
        </motion.div>
      )}

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: 'easeOut', delay: 0.24 }}>
        <HoldingsList holdings={historyData.holdingMetrics} />
      </motion.div>

      {historyData.unresolvableHoldings?.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: 'easeOut', delay: 0.30 }}>
          <OtherHoldings holdings={historyData.unresolvableHoldings} />
        </motion.div>
      )}


    </div>
  )
}

// ── Mobile Page ───────────────────────────────────────────────────────────────

// Palette for the allocation bar segments, cycling through distinct hues
const ALLOC_COLORS = [
  colors.gold,
  colors.positive,
  colors.info,
  colors.negative,
  colors.textMid,
  colors.goldSubtle,
]

function PortfolioMobile() {
  const [period, setPeriod] = useState<Period>('1y')
  const { data: historyData, isLoading: historyLoading, isError: historyError } =
    usePortfolioHistoryQuery<HistoryData>(period)

  const handlePeriodChange = useCallback((p: Period) => {
    setPeriod(p)
  }, [])

  // Loading state
  if (historyLoading && !historyData) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: 240,
      }}>
        <p style={{
          fontFamily: fonts.mono,
          fontSize: 13,
          color: colors.textMuted,
          letterSpacing: '0.06em',
        }}>
          Loading portfolio data...
        </p>
      </div>
    )
  }

  // Error / empty state
  if ((historyError && !historyData) || !historyData || historyData.holdingMetrics.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 320,
          gap: spacing.sectionGap,
          textAlign: 'center',
          padding: `0 ${spacing.pagePad}px`,
        }}
      >
        <p style={{ fontFamily: fonts.serif, fontSize: 22, color: colors.text }}>
          No price data available
        </p>
        <p style={{ fontFamily: fonts.mono, fontSize: 13, color: colors.textMuted, lineHeight: 1.7 }}>
          Connect a brokerage account with holdings to see portfolio performance.
        </p>
        <Link
          href="/dashboard/accounts"
          style={{
            padding: '12px 24px',
            minHeight: spacing.tapTarget,
            backgroundColor: colors.gold,
            borderRadius: 2,
            color: colors.surface,
            fontFamily: fonts.mono,
            fontSize: 13,
            letterSpacing: '0.08em',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
          }}
        >
          Connect an Account
        </Link>
      </motion.div>
    )
  }

  const sorted = [...historyData.holdingMetrics].sort((a, b) => b.value - a.value)

  // Allocation bar data: each holding with its weight among all holdings
  const totalValue = historyData.totalPortfolioValue > 0
    ? historyData.totalPortfolioValue
    : sorted.reduce((s, h) => s + h.value, 0)

  const allocSegments = sorted.map((h, i) => ({
    id: h.id,
    ticker: h.ticker,
    name: h.name,
    weight: totalValue > 0 ? h.value / totalValue : 0,
    color: ALLOC_COLORS[i % ALLOC_COLORS.length],
  }))

  // Underperformers for the callout section
  const underperformers = historyData.worstPerformers.filter(
    (p) => p.vsMarket !== null && p.vsMarket < -0.01,
  )

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: spacing.sectionGap,
      opacity: historyLoading ? 0.5 : 1,
    }}>

      {/* Header row with period selector */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
      >
        <span style={{
          fontFamily: fonts.serif,
          fontSize: 20,
          color: colors.text,
          fontWeight: 400,
        }}>
          Portfolio
        </span>
        {/* Period buttons */}
        <div style={{ display: 'flex', gap: 4 }}>
          {PERIOD_OPTIONS.map((opt) => {
            const active = opt.value === period
            return (
              <button
                key={opt.value}
                onClick={() => handlePeriodChange(opt.value)}
                disabled={historyLoading && !active}
                style={{
                  fontFamily: fonts.mono,
                  fontSize: 11,
                  letterSpacing: '0.08em',
                  minHeight: spacing.tapTarget,
                  minWidth: spacing.tapTarget,
                  padding: '0 10px',
                  borderRadius: 10,
                  border: active ? `1px solid ${colors.gold}` : `1px solid ${colors.border}`,
                  backgroundColor: active ? colors.gold : 'transparent',
                  color: active ? 'var(--color-bg)' : colors.textMuted,
                  opacity: historyLoading && !active ? 0.4 : 1,
                  cursor: historyLoading && !active ? 'default' : 'pointer',
                }}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      </motion.div>

      {/* 1. Total portfolio value */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      >
        <MobileMetricCard
          label="Portfolio Value"
          value={fmtDollars(historyData.totalPortfolioValue)}
          valueColor={colors.positive}
        />
      </motion.div>

      {/* 2. Allocation bar */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      >
        <MobileCard>
          <div style={{
            fontFamily: fonts.mono,
            fontSize: 10,
            color: colors.textMuted,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            marginBottom: spacing.tightGap,
          }}>
            Allocation
          </div>

          {/* Stacked horizontal bar */}
          <div style={{
            display: 'flex',
            height: 12,
            borderRadius: 2,
            overflow: 'hidden',
            marginBottom: spacing.tightGap,
          }}>
            {allocSegments.map((seg) => (
              <div
                key={seg.id}
                style={{
                  width: `${(seg.weight * 100).toFixed(2)}%`,
                  backgroundColor: seg.color,
                  flexShrink: 0,
                }}
              />
            ))}
          </div>

          {/* Legend rows */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {allocSegments.map((seg) => (
              <div
                key={seg.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <div style={{
                  width: 10,
                  height: 10,
                  borderRadius: 2,
                  backgroundColor: seg.color,
                  flexShrink: 0,
                }} />
                <span style={{
                  fontFamily: fonts.mono,
                  fontSize: 12,
                  color: colors.text,
                  flex: 1,
                  minWidth: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {seg.ticker}
                  {seg.name && seg.name.trim() ? ` - ${seg.name}` : ''}
                </span>
                <span style={{
                  fontFamily: fonts.mono,
                  fontSize: 12,
                  color: colors.textMuted,
                  flexShrink: 0,
                }}>
                  {(seg.weight * 100).toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </MobileCard>
      </motion.div>

      {/* 3. Holdings list */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      >
        <MobileCard>
          <div style={{
            fontFamily: fonts.mono,
            fontSize: 10,
            color: colors.textMuted,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            marginBottom: spacing.tightGap,
          }}>
            Holdings
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {sorted.map((h, i) => {
              const typeBadgeText = h.displayCategory === 'cash'
                ? 'CASH'
                : h.displayCategory === 'fixed_income'
                ? 'FIXED INC'
                : h.type
                  ? h.type.toUpperCase()
                  : 'EQUITY'

              return (
                <div
                  key={h.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    minHeight: spacing.tapTarget,
                    borderTop: i > 0 ? `1px solid ${colors.border}` : 'none',
                    paddingTop: i > 0 ? spacing.rowGap : 0,
                    paddingBottom: spacing.rowGap,
                    gap: 8,
                  }}
                >
                  {/* Left: ticker + badge */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 0 }}>
                    <span style={{
                      fontFamily: fonts.serif,
                      fontSize: 15,
                      color: colors.text,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}>
                      {h.ticker}
                      {h.name && h.name.trim() ? ` - ${h.name}` : ''}
                    </span>
                    <span style={{
                      fontFamily: fonts.mono,
                      fontSize: 10,
                      color: colors.textMuted,
                      backgroundColor: colors.surfaceAlt,
                      border: `1px solid ${colors.border}`,
                      borderRadius: 2,
                      padding: '2px 5px',
                      alignSelf: 'flex-start',
                      letterSpacing: '0.08em',
                    }}>
                      {typeBadgeText}
                    </span>
                  </div>
                  {/* Right: value */}
                  <span style={{
                    fontFamily: fonts.sans,
                    fontSize: 15,
                    color: colors.text,
                    flexShrink: 0,
                  }}>
                    {fmtDollars(h.value)}
                  </span>
                </div>
              )
            })}
          </div>
        </MobileCard>
      </motion.div>

      {/* 4. Underperformers (conditional) */}
      {underperformers.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          <MobileCard style={{ borderLeft: `3px solid ${colors.negative}` }}>
            <div style={{
              fontFamily: fonts.mono,
              fontSize: 10,
              color: colors.textMuted,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              marginBottom: spacing.tightGap,
            }}>
              UNDERPERFORMERS
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.rowGap }}>
              {underperformers.map((p) => (
                <div key={p.ticker} style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                  minHeight: spacing.tapTarget,
                  justifyContent: 'center',
                }}>
                  <span style={{
                    fontFamily: fonts.mono,
                    fontSize: 14,
                    color: colors.gold,
                    letterSpacing: '0.04em',
                  }}>
                    {p.ticker}
                  </span>
                  <span style={{
                    fontFamily: fonts.mono,
                    fontSize: 12,
                    color: colors.textMid,
                    lineHeight: 1.5,
                  }}>
                    {p.vsMarket !== null
                      ? `${fmtPct(Math.abs(p.vsMarket))} below market return`
                      : 'Underperformer'}
                  </span>
                  {p.opportunityCostDollars < 0 && (
                    <span style={{
                      fontFamily: fonts.mono,
                      fontSize: 12,
                      color: colors.negative,
                    }}>
                      Est. {fmtDollars(Math.abs(p.opportunityCostDollars))} relative drag
                    </span>
                  )}
                </div>
              ))}
            </div>
          </MobileCard>
        </motion.div>
      )}

    </div>
  )
}

// ── Device-aware entry point ──────────────────────────────────────────────────

export default function PortfolioPage() {
  const isMobile = useIsMobile()
  return isMobile ? <PortfolioMobile /> : <PortfolioDesktop />
}
