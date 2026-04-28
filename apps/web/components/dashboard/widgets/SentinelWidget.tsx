'use client'

import {
  CSSProperties,
  ReactElement,
  ReactNode,
  useEffect,
  useRef,
  useState,
} from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import PerimeterSVG from '@/components/watch/PerimeterSVG'
import WidgetCard from './WidgetCard'
import WidgetSkeleton, { WIDGET_REVEAL } from './WidgetSkeleton'
import {
  useWatchPerimeterQuery,
  useWatchStatusQuery,
} from '@/lib/queries'
import type {
  PerimeterResponse,
  Signal,
  SignalDomain,
  SignalSeverity,
} from '@/lib/types/vigilance'

// The bottom ~18px of PerimeterSVG contains the baked-in "PERIMETER" caption.
// Clipping the wrapper hides that caption without editing the shared component.
const PERIMETER_CAPTION_PAD = 18

function buildEyebrow(signalsActive: number): ReactNode {
  if (signalsActive === 0) return 'Sentinel · all quiet'
  return (
    <>
      Sentinel ·{' '}
      <span style={{ color: 'var(--color-positive)' }}>
        {signalsActive} active
      </span>
    </>
  )
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

const ctaLink: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '11px',
  letterSpacing: '0.08em',
  color: 'var(--color-gold)',
  textDecoration: 'none',
}

const TOP_FINDINGS_COUNT = 5

const DOMAIN_HUMAN: Record<SignalDomain, string> = {
  idle_cash: 'Idle cash drag',
  hysa: 'HYSA yield gap',
  debt: 'High-APR debt',
  match: 'Employer match gap',
  tax_advantaged: 'Tax-advantaged capacity',
  benefits: 'Benefits capacity',
  subscription: 'Subscription load',
  category_overspend: 'Spending pressure',
  recurring_change: 'Recurring drift',
}

function signalHeadline(signal: Signal): string {
  const label = (signal.payload as { label?: string } | null)?.label
  if (label && typeof label === 'string') return label
  return DOMAIN_HUMAN[signal.domain]
}

function severityColor(severity: SignalSeverity): string {
  switch (severity) {
    case 'urgent':
      return 'var(--color-negative)'
    case 'flagged':
      return 'var(--color-gold)'
    case 'advisory':
      return 'var(--color-text-muted)'
  }
}

const heroStyle: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontSize: 48,
  fontWeight: 400,
  lineHeight: 1,
  letterSpacing: '-0.01em',
  color: 'var(--color-gold)',
  margin: 0,
}

const heroSubStyle: CSSProperties = {
  fontFamily: 'var(--font-sans)',
  fontSize: 12,
  color: 'var(--color-text-muted)',
  margin: 0,
}

const contextStyle: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 13,
  color: 'var(--color-text-mid)',
  lineHeight: 1.5,
  margin: 0,
}

function ClippedPerimeter({
  cashAmount,
  signals,
}: {
  cashAmount: number
  signals: PerimeterResponse['signals']
}): ReactElement {
  const outerRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState(0)

  useEffect(() => {
    const el = outerRef.current
    if (!el) return
    const update = () => {
      const w = el.clientWidth
      const h = el.clientHeight
      // The inner clipped box is `size` wide and `size - CAPTION_PAD` tall, so
      // the SVG render size is bounded by container width and by container
      // height plus the cropped caption strip.
      const next = Math.min(w, h + PERIMETER_CAPTION_PAD)
      if (next > 0) setSize(Math.floor(next))
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <div
      ref={outerRef}
      aria-hidden="true"
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
      }}
    >
      {size > 0 && (
        <div
          style={{
            width: size,
            height: size - PERIMETER_CAPTION_PAD,
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
          }}
        >
          <PerimeterSVG cashAmount={cashAmount} signals={signals} size={size} />
        </div>
      )}
    </div>
  )
}

function SentinelShell({
  children,
  cta,
  eyebrow,
  withPerimeter,
  perimeter,
}: {
  children: ReactNode
  cta: ReactNode
  eyebrow: ReactNode
  withPerimeter?: boolean
  perimeter?: PerimeterResponse | null
}) {
  return (
    <>
      <style>{`
        .illumin-sentinel-widget-root {
          width: 100%;
          height: 100%;
        }
        .illumin-sentinel-widget-inner {
          display: flex;
          flex-direction: row;
          align-items: flex-start;
          gap: 24px;
          flex: 1;
          min-height: 0;
        }
        .illumin-sentinel-left {
          display: flex;
          flex-direction: column;
          flex: 1 1 auto;
          min-width: 0;
        }
        .illumin-sentinel-right {
          flex: 0 0 auto;
          width: clamp(140px, 35%, 240px);
          align-self: stretch;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .illumin-sentinel-findings {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-top: var(--space-section-above);
        }
        .illumin-sentinel-finding {
          display: flex;
          align-items: center;
          gap: 10px;
          font-family: var(--font-mono);
          font-size: 12px;
          color: var(--color-text-mid);
          line-height: 1.4;
        }
        .illumin-sentinel-finding-dot {
          width: 6px;
          height: 6px;
          border-radius: var(--radius-pill);
          flex: 0 0 auto;
        }
        .illumin-sentinel-finding-headline {
          flex: 1 1 auto;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .illumin-sentinel-finding-amount {
          flex: 0 0 auto;
          color: var(--color-text);
          font-variant-numeric: tabular-nums;
        }
        @media (max-width: 768px) {
          .illumin-sentinel-widget-inner {
            flex-direction: column;
            align-items: stretch;
            gap: 20px;
          }
          .illumin-sentinel-right {
            width: 100%;
            height: 220px;
            align-self: stretch;
          }
        }
      `}</style>
      <div className="illumin-sentinel-widget-root">
        <WidgetCard variant="list" eyebrow={eyebrow} cta={cta}>
          <div className="illumin-sentinel-widget-inner">
            <div className="illumin-sentinel-left">{children}</div>
            {withPerimeter && perimeter && (
              <div className="illumin-sentinel-right">
                <ClippedPerimeter
                  cashAmount={perimeter.cashAmount}
                  signals={perimeter.signals}
                />
              </div>
            )}
          </div>
        </WidgetCard>
      </div>
    </>
  )
}

export default function SentinelWidget(): ReactElement {
  const { data, isPending, isError } = useWatchStatusQuery()
  const { data: perimeter } = useWatchPerimeterQuery()

  if (isPending) {
    return <WidgetSkeleton variant="metric" />
  }

  const status = data ?? null

  if (isError || !status) {
    return (
      <motion.div {...WIDGET_REVEAL}>
        <SentinelShell
          eyebrow="Sentinel"
          cta={
            <Link href="/dashboard/sentinel" style={ctaLink}>
              Open sentinel &rarr;
            </Link>
          }
        >
          <p style={{ ...contextStyle, color: 'var(--color-text-mid)' }}>
            Watch status unavailable.
          </p>
        </SentinelShell>
      </motion.div>
    )
  }

  const isFresh = status.signalsMonitored === 0

  if (isFresh) {
    return (
      <motion.div {...WIDGET_REVEAL}>
        <SentinelShell
          eyebrow="Sentinel"
          cta={
            <Link href="/onboarding" style={ctaLink}>
              Complete setup &rarr;
            </Link>
          }
        >
          <p style={{ ...contextStyle, color: 'var(--color-text-mid)' }}>
            Setting up your watch...
          </p>
        </SentinelShell>
      </motion.div>
    )
  }

  // Aggregate dollar cost across active signals. /api/watch/status doesn't
  // return this; sum perimeter.signals[].annualValue client-side. When
  // status reports active signals but the perimeter query hasn't resolved
  // yet, render a placeholder rather than a misleading $0.
  const perimeterReady = perimeter !== undefined && perimeter !== null
  const aggregateCost = perimeterReady
    ? perimeter.signals.reduce((sum, s) => sum + Math.abs(s.annualValue), 0)
    : null
  const showZeroState = aggregateCost === 0
  const heroText =
    aggregateCost === null ? '—' : formatCurrency(aggregateCost)
  const heroSubText = showZeroState ? 'no findings to act on' : 'in unrealized cost'

  const topFindings = perimeterReady
    ? [...perimeter.signals]
        .sort((a, b) => Math.abs(b.annualValue) - Math.abs(a.annualValue))
        .slice(0, TOP_FINDINGS_COUNT)
    : []

  return (
    <motion.div {...WIDGET_REVEAL}>
      <SentinelShell
        eyebrow={buildEyebrow(status.signalsActive)}
        cta={
          <Link href="/dashboard/sentinel" style={ctaLink}>
            Open sentinel &rarr;
          </Link>
        }
        withPerimeter
        perimeter={perimeter}
      >
        <p style={heroStyle}>{heroText}</p>
        <div style={{ height: 'var(--space-value-to-subtext)' }} />
        <p style={heroSubStyle}>{heroSubText}</p>
        {topFindings.length > 0 && (
          <div className="illumin-sentinel-findings">
            {topFindings.map((s) => (
              <div key={s.id} className="illumin-sentinel-finding">
                <span
                  className="illumin-sentinel-finding-dot"
                  style={{ backgroundColor: severityColor(s.severity) }}
                />
                <span className="illumin-sentinel-finding-headline">
                  {signalHeadline(s)}
                </span>
                <span className="illumin-sentinel-finding-amount">
                  {formatCurrency(Math.abs(s.annualValue))}
                </span>
              </div>
            ))}
          </div>
        )}
      </SentinelShell>
    </motion.div>
  )
}
