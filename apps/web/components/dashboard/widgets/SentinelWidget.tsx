'use client'

import { CSSProperties, ReactElement, ReactNode } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import PerimeterSVG from '@/components/watch/PerimeterSVG'
import WidgetCard from './WidgetCard'
import WidgetSkeleton, { WIDGET_REVEAL } from './WidgetSkeleton'
import {
  useWatchPerimeterQuery,
  useWatchStatusQuery,
} from '@/lib/queries'
import type { PerimeterResponse } from '@/lib/types/vigilance'

const PERIMETER_SIZE_DESKTOP = 160
const PERIMETER_SIZE_MOBILE = 120
// The bottom ~18px of PerimeterSVG contains the baked-in "PERIMETER" caption.
// Clipping the wrapper hides that caption without editing the shared component.
const PERIMETER_CAPTION_PAD = 18

function buildEyebrow(signalsActive: number): string {
  if (signalsActive === 0) return 'Sentinel · all quiet'
  return `Sentinel · ${signalsActive} active`
}

function buildMetaLine(signalsMonitored: number, signalsNew: number): string {
  const segments = [`${signalsMonitored} monitored`]
  if (signalsNew > 0) segments.push(`${signalsNew} new since last visit`)
  return segments.join(' · ')
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

const subheadStyle: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 12,
  color: 'var(--color-text-muted)',
  margin: 0,
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

const metaStyle: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 11,
  color: 'var(--color-text-muted)',
  lineHeight: 1.5,
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
  size,
  cashAmount,
  signals,
}: {
  size: number
  cashAmount: number
  signals: PerimeterResponse['signals']
}): ReactElement {
  return (
    <div
      aria-hidden="true"
      style={{
        width: size,
        height: size - PERIMETER_CAPTION_PAD,
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        pointerEvents: 'none',
      }}
    >
      <PerimeterSVG cashAmount={cashAmount} signals={signals} size={size} />
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
  eyebrow: string
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
        }
        .illumin-sentinel-left {
          display: flex;
          flex-direction: column;
          flex: 1 1 55%;
          min-width: 0;
        }
        .illumin-sentinel-right {
          flex: 0 0 auto;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .illumin-sentinel-perimeter-desktop { display: block; }
        .illumin-sentinel-perimeter-mobile { display: none; }
        @media (max-width: 768px) {
          .illumin-sentinel-widget-inner {
            flex-direction: column;
            align-items: stretch;
            gap: 20px;
          }
          .illumin-sentinel-right {
            justify-content: center;
          }
          .illumin-sentinel-perimeter-desktop { display: none; }
          .illumin-sentinel-perimeter-mobile { display: block; }
        }
      `}</style>
      <div className="illumin-sentinel-widget-root">
        <WidgetCard variant="list" eyebrow={eyebrow} cta={cta}>
          <div className="illumin-sentinel-widget-inner">
            <div className="illumin-sentinel-left">{children}</div>
            {withPerimeter && perimeter && (
              <div className="illumin-sentinel-right">
                <div className="illumin-sentinel-perimeter-desktop">
                  <ClippedPerimeter
                    size={PERIMETER_SIZE_DESKTOP}
                    cashAmount={perimeter.cashAmount}
                    signals={perimeter.signals}
                  />
                </div>
                <div className="illumin-sentinel-perimeter-mobile">
                  <ClippedPerimeter
                    size={PERIMETER_SIZE_MOBILE}
                    cashAmount={perimeter.cashAmount}
                    signals={perimeter.signals}
                  />
                </div>
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
          <p style={subheadStyle}>Illumin&apos;s Vigilance Engine</p>
          <div style={{ height: 'var(--space-label-to-value)' }} />
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
          <p style={subheadStyle}>Illumin&apos;s Vigilance Engine</p>
          <div style={{ height: 'var(--space-label-to-value)' }} />
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
        <p style={subheadStyle}>Illumin&apos;s Vigilance Engine</p>
        <div style={{ height: 'var(--space-label-to-value)' }} />
        <p style={heroStyle}>{heroText}</p>
        <div style={{ height: 'var(--space-value-to-subtext)' }} />
        <p style={heroSubStyle}>{heroSubText}</p>
        <div style={{ height: 12 }} />
        <p style={metaStyle}>
          {buildMetaLine(status.signalsMonitored, status.signalsNew)}
        </p>
      </SentinelShell>
    </motion.div>
  )
}
