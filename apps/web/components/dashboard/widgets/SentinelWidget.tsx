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

function integrityColor(score: number): string {
  if (score >= 90) return 'var(--color-positive)'
  if (score < 70) return 'var(--color-negative)'
  return 'var(--color-text)'
}

function buildContextLine(
  signalsMonitored: number,
  signalsActive: number,
  signalsNew: number,
): string {
  const segments: string[] = [`${signalsMonitored} signals monitored`]
  if (signalsActive === 0) {
    segments.push('all quiet')
  } else {
    segments.push(`${signalsActive} active`)
    if (signalsNew > 0) {
      segments.push(`${signalsNew} new since last visit`)
    }
  }
  return segments.join(' · ')
}

const ctaLink: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '11px',
  letterSpacing: '0.08em',
  color: 'var(--color-gold)',
  textDecoration: 'none',
}

const heroStyle: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontSize: 48,
  fontWeight: 400,
  lineHeight: 1,
  letterSpacing: '-0.01em',
  margin: 0,
}

const subtextStyle: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 11,
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
  withPerimeter,
  perimeter,
}: {
  children: ReactNode
  cta: ReactNode
  withPerimeter?: boolean
  perimeter?: PerimeterResponse | null
}) {
  return (
    <>
      <style>{`
        .illumin-sentinel-widget-root {
          width: 100%;
        }
        .illumin-sentinel-widget-inner {
          display: flex;
          flex-direction: row;
          align-items: center;
          gap: 24px;
          flex: 1;
          min-height: 164px;
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
        <WidgetCard variant="list" eyebrow="Sentinel" cta={cta}>
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
      <SentinelShell
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
    )
  }

  const isFresh = status.signalsMonitored === 0

  if (isFresh) {
    return (
      <SentinelShell
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
    )
  }

  const integrity = status.perimeterIntegrity
  const contextLine = buildContextLine(
    status.signalsMonitored,
    status.signalsActive,
    status.signalsNew,
  )

  return (
    <motion.div {...WIDGET_REVEAL}>
      <SentinelShell
        cta={
          <Link href="/dashboard/sentinel" style={ctaLink}>
            Open sentinel &rarr;
          </Link>
        }
        withPerimeter
        perimeter={perimeter}
      >
        <p style={{ ...heroStyle, color: integrityColor(integrity) }}>
          {integrity}
        </p>
        <div style={{ height: 4 }} />
        <p style={subtextStyle}>out of 100</p>
        <div style={{ height: 16 }} />
        <p style={contextStyle}>{contextLine}</p>
      </SentinelShell>
    </motion.div>
  )
}
