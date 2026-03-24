'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { motion, type Transition } from 'framer-motion'
import Link from 'next/link'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Legend,
  ScatterChart,
  Scatter,
  ZAxis,
  AreaChart,
  Area,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { supabase } from '@/lib/supabase'

// ── Types ─────────────────────────────────────────────────────────────────────

interface HoldingMetric {
  id: string
  ticker: string
  name: string
  type: string
  weight: number
  value: number
  costBasis: number | null
  sector: string | null
  individualReturn: number
  benchmarkReturn: number
  contributionPct: number
  opportunityCostDollars: number
  volatility: number
  beta: number
  returnSource: 'price_history' | 'cost_basis' | 'none'
}

interface WorstPerformer {
  ticker: string
  name: string
  return: number
  benchmarkReturn: number
  vsMarket: number
  opportunityCostDollars: number
  value: number
}

interface DrawdownPoint {
  date: string
  drawdown: number
}

interface AnalyticsData {
  portfolioReturn: number
  portfolioAnnualizedReturn: number
  benchmarkReturn: number
  benchmarkAnnualizedReturn: number
  portfolioVolatility: number
  portfolioBeta: number
  portfolioSharpe: number
  maxDrawdown: { value: number; date: string }
  holdingMetrics: HoldingMetric[]
  worstPerformers: WorstPerformer[]
  drawdownSeries: DrawdownPoint[]
  sectorWeights: Record<string, number>
  sp500SectorWeights: Record<string, number>
  correlationMatrix: number[][]
  correlationTickers: string[]
  benchmarkPriceHistory: { date: string; close: number }[]
}

// ── Formatters ────────────────────────────────────────────────────────────────

function fmtPct(n: number, showSign = false) {
  const sign = showSign && n > 0 ? '+' : ''
  return `${sign}${(n * 100).toFixed(1)}%`
}

function fmtDollars(n: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n)
}

function round2(n: number) {
  return Math.round(n * 100) / 100
}

// ── Shared styles ─────────────────────────────────────────────────────────────

const card: React.CSSProperties = {
  backgroundColor: 'var(--color-surface)',
  border: '1px solid var(--color-gold-border)',
  borderRadius: '2px',
  padding: '28px',
}

const sectionLabel: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '10px',
  color: 'var(--color-text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.16em',
  marginBottom: '20px',
  display: 'block',
}

// ── Section help tooltip ─────────────────────────────────────────────────────

function SectionHelp({ text }: { text: string }) {
  const [visible, setVisible] = useState(false)
  return (
    <div
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '16px',
        height: '16px',
        borderRadius: '50%',
        border: '1px solid var(--color-border)',
        cursor: 'default',
        fontFamily: 'var(--font-mono)',
        fontSize: '9px',
        color: 'var(--color-text-muted)',
        flexShrink: 0,
        marginLeft: '8px',
      }}
    >
      ?
      {visible && (
        <div style={{
          position: 'absolute',
          top: '-4px',
          left: '24px',
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
          textTransform: 'none',
          letterSpacing: '0',
          fontWeight: 400,
        }}>
          {text}
        </div>
      )}
    </div>
  )
}

// ── Metric Cards ──────────────────────────────────────────────────────────────

function AnalyticsMetricCards({ data }: { data: AnalyticsData }) {
  const metrics = [
    {
      label: 'Beta',
      value: round2(data.portfolioBeta).toFixed(2),
      sub: 'Relative market sensitivity',
      color: 'var(--color-text)',
      help: 'Measures how much your portfolio moves relative to the market. A beta of 1.0 means it tracks the S&P 500 exactly. Above 1.0 means bigger swings in both directions. Below 1.0 means smoother ride.',
    },
    {
      label: 'Sharpe Ratio',
      value: round2(data.portfolioSharpe).toFixed(2),
      sub: 'Risk-adjusted return (annualized)',
      color: data.portfolioSharpe >= 1 ? 'var(--color-positive)' : data.portfolioSharpe >= 0 ? 'var(--color-text)' : 'var(--color-negative)',
      help: 'Your return per unit of risk taken. Above 1.0 is good, above 2.0 is excellent. Below 0 means you lost money. This tells you whether the volatility you are taking is actually being rewarded with returns.',
    },
    {
      label: 'Max Drawdown',
      value: fmtPct(data.maxDrawdown.value),
      sub: `Peak-to-trough. Reached ${data.maxDrawdown.date}`,
      color: 'var(--color-negative)',
      help: 'The largest drop from a portfolio high to a subsequent low. This is the worst-case loss you experienced without selling. Smaller drawdowns mean less pain during downturns.',
    },
    {
      label: 'Annualized Volatility',
      value: fmtPct(data.portfolioVolatility),
      sub: 'Standard deviation of daily returns',
      color: 'var(--color-text)',
      help: 'How much your portfolio value swings day to day, scaled to a yearly number. 15% is typical for a stock portfolio. Above 25% is high. Below 10% is conservative. Higher volatility means less predictable outcomes.',
    },
  ]

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
      {metrics.map((m) => (
        <div key={m.label} style={{ ...card, position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
            <span style={{ ...sectionLabel, marginBottom: 0 }}>{m.label}</span>
            <SectionHelp text={m.help} />
          </div>
          <p style={{
            fontFamily: 'var(--font-display)',
            fontSize: '26px',
            color: m.color,
            fontWeight: 400,
            marginBottom: '6px',
          }}>
            {m.value}
          </p>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
            {m.sub}
          </p>
        </div>
      ))}
    </div>
  )
}

// ── Performance Attribution Chart ─────────────────────────────────────────────

function PerformanceAttribution({ holdings }: { holdings: HoldingMetric[] }) {
  const costBasisCount = holdings.filter((h) => h.returnSource === 'cost_basis').length
  const data = [...holdings]
    .sort((a, b) => b.contributionPct - a.contributionPct)
    .map((h) => ({
      ticker: h.ticker,
      contribution: parseFloat((h.contributionPct * 100).toFixed(3)),
    }))

  return (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
        <span style={{ ...sectionLabel, marginBottom: 0 }}>Performance Attribution</span>
        <SectionHelp text="Shows how much each holding contributed to your total portfolio return. Longer bars mean bigger impact. Green bars helped your returns, red bars hurt them." />
      </div>
      {costBasisCount > 0 && (
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--color-text-muted)', marginBottom: '12px' }}>
          {costBasisCount} holding{costBasisCount > 1 ? 's' : ''} without live price data. Returns estimated from cost basis.
        </p>
      )}
      <ResponsiveContainer width="100%" height={Math.max(data.length * 40, 200) + 28}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 0, right: 20, left: 0, bottom: 28 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-grid-line)" horizontal={false} />
          <XAxis
            type="number"
            tickFormatter={(v) => `${v > 0 ? '+' : ''}${v.toFixed(1)} pp`}
            tick={{ fontFamily: 'var(--font-mono)', fontSize: 10, fill: 'var(--color-text-muted)' }}
            label={{
              value: 'Contribution to portfolio return (percentage points)',
              position: 'insideBottom',
              offset: 0,
              style: { fontFamily: 'var(--font-mono)', fontSize: 10, fill: 'var(--color-text-muted)' },
            }}
          />
          <YAxis
            type="category"
            dataKey="ticker"
            tick={{ fontFamily: 'var(--font-mono)', fontSize: 11, fill: 'var(--color-gold)' }}
            width={48}
          />
          <Tooltip
            cursor={{ fill: 'var(--color-surface-texture)' }}
            content={({ payload }) => {
              if (!payload?.length) return null
              const d = payload[0].payload as { ticker: string; contribution: number }
              return (
                <div style={{
                  backgroundColor: 'var(--color-surface-2)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '2px',
                  padding: '8px 12px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  color: 'var(--color-text)',
                }}>
                  {d.ticker}: contributed {d.contribution >= 0 ? '+' : ''}{d.contribution.toFixed(2)} percentage points to your total return
                </div>
              )
            }}
          />
          <ReferenceLine x={0} stroke="var(--color-border-strong)" />
          <Bar dataKey="contribution" radius={[0, 2, 2, 0]}>
            {data.map((d) => (
              <Cell
                key={d.ticker}
                fill={d.contribution >= 0 ? 'var(--color-positive)' : 'var(--color-negative)'}
                opacity={0.75}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── Risk vs Return Scatter ─────────────────────────────────────────────────────

function RiskReturnScatter({
  holdings,
  benchmarkVolatility,
  benchmarkReturn,
}: {
  holdings: HoldingMetric[]
  benchmarkVolatility: number
  benchmarkReturn: number
}) {
  const data = holdings.map((h) => ({
    ticker: h.ticker,
    volatility: parseFloat((h.volatility * 100).toFixed(2)),
    return: parseFloat((h.individualReturn * 100).toFixed(2)),
    weight: parseFloat((h.weight * 100).toFixed(1)),
  }))

  const benchData = [{
    ticker: 'S&P 500',
    volatility: parseFloat((benchmarkVolatility * 100).toFixed(2)),
    return: parseFloat((benchmarkReturn * 100).toFixed(2)),
    weight: 100,
  }]

  return (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
        <span style={{ ...sectionLabel, marginBottom: 0 }}>Risk vs Return</span>
        <SectionHelp text="Each bubble is a holding. Right means more volatile, up means higher return. You want holdings in the upper-left (high return, low risk). The dashed lines show where the S&P 500 sits for comparison." />
      </div>
      <ResponsiveContainer width="100%" height={360}>
        <ScatterChart margin={{ top: 10, right: 20, bottom: 30, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-grid-line)" />
          <XAxis
            type="number"
            dataKey="volatility"
            name="Volatility"
            unit="%"
            tick={{ fontFamily: 'var(--font-mono)', fontSize: 10, fill: 'var(--color-text-muted)' }}
            label={{
              value: 'Annualized Volatility (%)',
              position: 'insideBottom',
              offset: -10,
              style: { fontFamily: 'var(--font-mono)', fontSize: 10, fill: 'var(--color-text-muted)' },
            }}
          />
          <YAxis
            type="number"
            dataKey="return"
            name="Return"
            unit="%"
            tick={{ fontFamily: 'var(--font-mono)', fontSize: 10, fill: 'var(--color-text-muted)' }}
            label={{
              value: 'Return (%)',
              angle: -90,
              position: 'insideLeft',
              style: { fontFamily: 'var(--font-mono)', fontSize: 10, fill: 'var(--color-text-muted)' },
            }}
          />
          <ZAxis type="number" dataKey="weight" range={[60, 400]} />
          <Tooltip
            cursor={{ strokeDasharray: '3 3' }}
            content={({ payload }) => {
              if (!payload?.length) return null
              const d = payload[0].payload as typeof data[0]
              return (
                <div style={{
                  backgroundColor: 'var(--color-surface-2)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '2px',
                  padding: '8px 12px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  color: 'var(--color-text)',
                }}>
                  <strong>{d.ticker}</strong><br />
                  Return: {d.return >= 0 ? '+' : ''}{d.return}%<br />
                  Volatility: {d.volatility}%<br />
                  Weight: {d.weight}%
                </div>
              )
            }}
          />
          <ReferenceLine
            x={benchmarkVolatility * 100}
            stroke="var(--color-gold)"
            strokeDasharray="4 4"
            strokeOpacity={0.5}
          />
          <ReferenceLine
            y={benchmarkReturn * 100}
            stroke="var(--color-gold)"
            strokeDasharray="4 4"
            strokeOpacity={0.5}
          />
          <Scatter data={benchData} fill="var(--color-gold)" opacity={0.7} name="Benchmark" />
          <Scatter data={data} fill="var(--color-positive)" opacity={0.75} name="Holdings" />
          <Legend
            wrapperStyle={{ fontFamily: 'var(--font-mono)', fontSize: '10px', paddingTop: '24px', textAlign: 'center' }}
            align="center"
          />
        </ScatterChart>
      </ResponsiveContainer>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
        Dashed lines mark S&P 500 return and volatility. Bubble size reflects portfolio weight.
      </p>
    </div>
  )
}

// ── Sector vs Benchmark ───────────────────────────────────────────────────────

function SectorVsBenchmark({
  sectorWeights,
  sp500Weights,
}: {
  sectorWeights: Record<string, number>
  sp500Weights: Record<string, number>
}) {
  const allSectors = [...new Set([...Object.keys(sectorWeights), ...Object.keys(sp500Weights)])]
  const data = allSectors
    .map((sector) => ({
      sector: sector.length > 14 ? sector.slice(0, 12) + '...' : sector,
      fullSector: sector,
      portfolio: parseFloat((sectorWeights[sector] ?? 0).toFixed(1)),
      benchmark: parseFloat((sp500Weights[sector] ?? 0).toFixed(1)),
    }))
    .filter((d) => d.portfolio > 0 || d.benchmark > 0)
    .sort((a, b) => b.portfolio - a.portfolio)

  return (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
        <span style={{ ...sectionLabel, marginBottom: 0 }}>Sector vs S&P 500 Benchmark</span>
        <SectionHelp text="Compares your sector allocation to the S&P 500. If your bar is taller, you are overweight that sector. Large overweights mean your portfolio is making a concentrated bet on that sector outperforming." />
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 0, right: 10, bottom: 30, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-grid-line)" />
          <XAxis
            dataKey="sector"
            tick={{ fontFamily: 'var(--font-mono)', fontSize: 9, fill: 'var(--color-text-muted)' }}
            angle={-25}
            textAnchor="end"
            interval={0}
          />
          <YAxis
            tickFormatter={(v) => `${v}%`}
            tick={{ fontFamily: 'var(--font-mono)', fontSize: 10, fill: 'var(--color-text-muted)' }}
          />
          <Tooltip
            cursor={{ fill: 'var(--color-surface-texture)' }}
            content={({ payload, label }) => {
              if (!payload?.length) return null
              const d = payload[0].payload as typeof data[0]
              const diff = d.portfolio - d.benchmark
              return (
                <div style={{
                  backgroundColor: 'var(--color-surface-2)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '2px',
                  padding: '8px 12px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  color: 'var(--color-text)',
                }}>
                  <strong>{d.fullSector}</strong><br />
                  Your portfolio: {d.portfolio}%<br />
                  S&P 500: {d.benchmark}%<br />
                  <span style={{ color: diff >= 0 ? 'var(--color-positive)' : 'var(--color-negative)' }}>
                    {diff >= 0 ? 'Overweight' : 'Underweight'} by {Math.abs(diff).toFixed(1)}%
                  </span>
                </div>
              )
            }}
          />
          <Legend
            wrapperStyle={{ fontFamily: 'var(--font-mono)', fontSize: '10px', paddingTop: '24px', textAlign: 'center' }}
            align="center"
          />
          <Bar dataKey="portfolio" name="Your portfolio" fill="var(--color-gold)" opacity={0.8} radius={[2, 2, 0, 0]} />
          <Bar dataKey="benchmark" name="S&P 500 (benchmark)" fill="var(--color-info)" opacity={0.6} radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── Correlation Matrix ────────────────────────────────────────────────────────

function correlationBg(v: number): string {
  if (v >= 0.8) return 'color-mix(in srgb, var(--color-negative) 55%, transparent)'
  if (v >= 0.6) return 'color-mix(in srgb, var(--color-negative) 30%, transparent)'
  if (v >= 0.4) return 'var(--color-surface-texture)'
  if (v >= 0.2) return 'color-mix(in srgb, var(--color-positive) 15%, transparent)'
  return 'color-mix(in srgb, var(--color-positive) 8%, transparent)'
}

function CorrelationMatrix({
  matrix,
  tickers,
}: {
  matrix: number[][]
  tickers: string[]
}) {
  if (tickers.length === 0) return null

  const cellSize = Math.min(64, Math.floor(560 / tickers.length))

  return (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
        <span style={{ ...sectionLabel, marginBottom: 0 }}>Correlation Matrix</span>
        <SectionHelp text="Shows how closely your holdings move together day to day. Red cells (near 1.0) move in lockstep, which means less diversification. Green cells (near 0) move independently, giving you better protection when one sector drops." />
      </div>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '16px', lineHeight: 1.5 }}>
        Pearson correlation of daily returns. Values near 1 indicate holdings that move together. Near 0 indicates low correlation (diversification benefit).
      </p>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'separate', borderSpacing: '2px' }}>
          <thead>
            <tr>
              <th style={{ width: `${cellSize}px`, height: `${cellSize}px` }} />
              {tickers.map((t) => (
                <th
                  key={t}
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '10px',
                    color: 'var(--color-gold)',
                    textAlign: 'center',
                    padding: '0 2px 8px',
                    letterSpacing: '0.04em',
                    width: `${cellSize}px`,
                  }}
                >
                  {t}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.map((row, ri) => (
              <tr key={tickers[ri]}>
                <td style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '10px',
                  color: 'var(--color-gold)',
                  paddingRight: '8px',
                  letterSpacing: '0.04em',
                  whiteSpace: 'nowrap',
                }}>
                  {tickers[ri]}
                </td>
                {row.map((val, ci) => (
                  <td
                    key={ci}
                    style={{
                      width: `${cellSize}px`,
                      height: `${cellSize}px`,
                      backgroundColor: correlationBg(val),
                      textAlign: 'center',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '11px',
                      color: 'var(--color-text)',
                      borderRadius: '2px',
                    }}
                  >
                    {val.toFixed(2)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ display: 'flex', gap: '16px', marginTop: '12px', flexWrap: 'wrap' }}>
        {[
          { bg: 'color-mix(in srgb, var(--color-negative) 55%, transparent)', label: 'High correlation (0.8+)' },
          { bg: 'var(--color-surface-texture)', label: 'Moderate (0.4-0.6)' },
          { bg: 'color-mix(in srgb, var(--color-positive) 15%, transparent)', label: 'Low (below 0.4)' },
        ].map((l) => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '2px', backgroundColor: l.bg }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--color-text-muted)' }}>
              {l.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Drawdown Chart ────────────────────────────────────────────────────────────

function DrawdownChart({ series }: { series: DrawdownPoint[] }) {
  const data = series.map((d) => ({
    date: d.date,
    drawdown: parseFloat((d.drawdown * 100).toFixed(2)),
  }))

  return (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
        <span style={{ ...sectionLabel, marginBottom: 0 }}>Drawdown from Peak</span>
        <SectionHelp text="Shows how far your portfolio dropped from its highest point at any given time. Deeper dips mean larger losses before recovery. The worst dip is your max drawdown. This helps you understand the real downside you have experienced." />
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={data} margin={{ top: 10, right: 10, bottom: 30, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-grid-line)" />
          <XAxis
            dataKey="date"
            tick={{ fontFamily: 'var(--font-mono)', fontSize: 9, fill: 'var(--color-text-muted)' }}
            tickFormatter={(d) => d.slice(0, 7)}
            interval="preserveStartEnd"
          />
          <YAxis
            tickFormatter={(v) => `${v}%`}
            tick={{ fontFamily: 'var(--font-mono)', fontSize: 10, fill: 'var(--color-text-muted)' }}
            label={{
              value: '% below portfolio peak',
              angle: -90,
              position: 'insideLeft',
              offset: 10,
              style: { fontFamily: 'var(--font-mono)', fontSize: 9, fill: 'var(--color-text-muted)' },
            }}
          />
          <Tooltip
            content={({ payload }) => {
              if (!payload?.length) return null
              const d = payload[0].payload as { date: string; drawdown: number }
              return (
                <div style={{
                  backgroundColor: 'var(--color-surface-2)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '2px',
                  padding: '8px 12px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  color: 'var(--color-text)',
                }}>
                  {d.date}<br />
                  Drawdown: {d.drawdown.toFixed(1)}%
                </div>
              )
            }}
          />
          <ReferenceLine y={0} stroke="var(--color-border-strong)" />
          <Area
            type="monotone"
            dataKey="drawdown"
            stroke="var(--color-negative)"
            fill="var(--color-negative-bg)"
            strokeWidth={1.5}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── Tax Lot Table ─────────────────────────────────────────────────────────────

const SHORT_TERM_RATE = 0.37
const LONG_TERM_RATE = 0.20

function TaxLotTable({ holdings }: { holdings: HoldingMetric[] }) {
  const withBasis = holdings.filter((h) => h.costBasis != null)
  if (withBasis.length === 0) {
    return (
      <div style={card}>
        <span style={sectionLabel}>Tax Lot Estimates</span>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--color-text-muted)' }}>
          No cost basis data available from your connected accounts.
        </p>
      </div>
    )
  }

  return (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
        <span style={{ ...sectionLabel, marginBottom: 0 }}>Tax Lot Estimates</span>
        <SectionHelp text="Estimates how much tax you would owe (or save) if you sold each position today. Green means gains that would be taxed. Red means losses that could offset other gains. Useful for planning tax-loss harvesting at year end." />
      </div>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '16px', lineHeight: 1.5 }}>
        Tax lot estimates, based on cost basis and approximate tax rates. Not tax advice. Short-term rate: {(SHORT_TERM_RATE * 100).toFixed(0)}%. Long-term rate: {(LONG_TERM_RATE * 100).toFixed(0)}%. Without purchase dates, all gains are shown as estimated long-term.
      </p>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {[
                'Ticker',
                'Short-term gain/loss ($)',
                'Short-term gain/loss (% of position)',
                'Long-term gain/loss ($)',
                'Long-term gain/loss (% of position)',
                'Est. tax impact ($)',
              ].map((h) => (
                <th
                  key={h}
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '10px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: 'var(--color-text-muted)',
                    textAlign: 'left',
                    paddingBottom: '12px',
                    paddingRight: '16px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {withBasis.map((h) => {
              const basis = h.costBasis!
              const gainLoss = h.value - basis
              const gainLossPct = basis > 0 ? gainLoss / basis : 0
              // Without purchase date data, treat all as long-term (conservative)
              const taxImpact = gainLoss > 0 ? gainLoss * LONG_TERM_RATE : gainLoss * SHORT_TERM_RATE
              const positive = gainLoss >= 0

              return (
                <tr key={h.id} style={{ borderTop: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '10px 16px 10px 0' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--color-gold)' }}>
                      {h.ticker}
                    </span>
                  </td>
                  <td style={{ padding: '10px 16px 10px 0' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--color-text-muted)' }}>--</span>
                  </td>
                  <td style={{ padding: '10px 16px 10px 0' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--color-text-muted)' }}>--</span>
                  </td>
                  <td style={{ padding: '10px 16px 10px 0' }}>
                    <span style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '12px',
                      color: positive ? 'var(--color-positive)' : 'var(--color-negative)',
                    }}>
                      {positive ? '+' : ''}{fmtDollars(gainLoss)}
                    </span>
                  </td>
                  <td style={{ padding: '10px 16px 10px 0' }}>
                    <span style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '12px',
                      color: positive ? 'var(--color-positive)' : 'var(--color-negative)',
                    }}>
                      {gainLossPct >= 0 ? '+' : ''}{(gainLossPct * 100).toFixed(1)}%
                    </span>
                  </td>
                  <td style={{ padding: '10px 0' }}>
                    <span style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '12px',
                      color: taxImpact < 0 ? 'var(--color-negative)' : 'var(--color-positive)',
                    }}>
                      {taxImpact >= 0 ? '+' : ''}{fmtDollars(taxImpact)}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Stress Test Table ─────────────────────────────────────────────────────────

function StressTestTable({ beta }: { beta: number }) {
  const scenarios = [
    { scenario: '2008 Financial Crisis', marketDecline: -0.38 },
    { scenario: 'March 2020 COVID', marketDecline: -0.34 },
    { scenario: '2022 Rate Hike Cycle', marketDecline: -0.19 },
    { scenario: '2022 Tech Selloff', marketDecline: -0.12 },
  ]

  return (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
        <span style={{ ...sectionLabel, marginBottom: 0 }}>Stress Test Scenarios</span>
        <SectionHelp text="Estimates how your portfolio would have performed during past market crashes, based on your current beta. Higher beta means larger estimated losses. This is not a prediction, but it shows how sensitive your portfolio is to market downturns." />
      </div>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '16px', lineHeight: 1.5 }}>
        Estimated portfolio impact based on current beta ({beta.toFixed(2)}) and sector exposure. All values are percentages.
      </p>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {['Scenario', 'Market Decline', 'Estimated Portfolio Impact'].map((h) => (
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
                  paddingRight: '24px',
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {scenarios.map((s) => {
            const portfolioImpact = s.marketDecline * beta
            return (
              <tr key={s.scenario} style={{ borderTop: '1px solid var(--color-border)' }}>
                <td style={{ padding: '12px 24px 12px 0' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--color-text)' }}>
                    {s.scenario}
                  </span>
                </td>
                <td style={{ padding: '12px 24px 12px 0' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--color-negative)' }}>
                    {fmtPct(s.marketDecline)}
                  </span>
                </td>
                <td style={{ padding: '12px 0' }}>
                  <span style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '15px',
                    color: portfolioImpact >= 0 ? 'var(--color-positive)' : 'var(--color-negative)',
                  }}>
                    {fmtPct(portfolioImpact)}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function PortfolioAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const fetchedRef = useRef(false)

  const loadData = useCallback(async () => {
    if (fetchedRef.current) return
    fetchedRef.current = true
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const headers: Record<string, string> = {}
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`
      }
      const res = await fetch('/api/portfolio/history', { headers })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      setData(json)
    } catch (err) {
      console.error('[PortfolioAnalyticsPage]', err)
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '320px' }}>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', color: 'var(--color-text-muted)', letterSpacing: '0.06em' }}>
          Loading analytics data...
        </p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0' }}>
        <p style={{ fontFamily: 'var(--font-display)', fontSize: '22px', color: 'var(--color-text)', marginBottom: '12px' }}>
          Unable to load analytics
        </p>
        <Link href="/dashboard/portfolio" style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--color-gold)', textDecoration: 'none' }}>
          Return to portfolio overview
        </Link>
      </div>
    )
  }

  const delay = (i: number): Transition => ({ duration: 0.4, ease: 'easeOut', delay: i * 0.07 })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Back link */}
      <Link
        href="/dashboard/portfolio"
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '12px',
          color: 'var(--color-gold)',
          textDecoration: 'none',
          letterSpacing: '0.06em',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--color-text)' }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--color-gold)' }}
      >
        &larr; Portfolio overview
      </Link>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={delay(0)}>
        <AnalyticsMetricCards data={data} />
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={delay(1)}>
        <PerformanceAttribution holdings={data.holdingMetrics} />
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={delay(2)}>
        <RiskReturnScatter
          holdings={data.holdingMetrics}
          benchmarkVolatility={data.portfolioVolatility}
          benchmarkReturn={data.benchmarkReturn}
        />
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={delay(3)}>
        <SectorVsBenchmark
          sectorWeights={data.sectorWeights}
          sp500Weights={data.sp500SectorWeights}
        />
      </motion.div>

      {data.correlationTickers.length > 1 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={delay(4)}>
          <CorrelationMatrix
            matrix={data.correlationMatrix}
            tickers={data.correlationTickers}
          />
        </motion.div>
      )}

      {data.drawdownSeries.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={delay(5)}>
          <DrawdownChart series={data.drawdownSeries} />
        </motion.div>
      )}

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={delay(6)}>
        <TaxLotTable holdings={data.holdingMetrics} />
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={delay(7)}>
        <StressTestTable beta={data.portfolioBeta} />
      </motion.div>

    </div>
  )
}
