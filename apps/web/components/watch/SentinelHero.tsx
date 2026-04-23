"use client";

import type { CSSProperties, ReactElement } from "react";
import type { WatchStatus } from "@/lib/types/vigilance";

export interface SentinelHeroProps {
  watchStatus: WatchStatus;
  className?: string;
}

const HOUR_MS = 60 * 60 * 1000;
const MIN_MS = 60 * 1000;

function formatWatchSinceDate(iso: string): string {
  const d = new Date(iso);
  return d
    .toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
    .toUpperCase();
}

function formatNextScan(iso: string | null): string {
  if (!iso) return "SOON";
  const target = new Date(iso).getTime();
  const delta = target - Date.now();
  if (delta <= 0) return "IMMINENT";
  if (delta < 2 * MIN_MS) return "IN <1M";
  if (delta < HOUR_MS) {
    const minutes = Math.floor(delta / MIN_MS);
    return `IN ${minutes}M`;
  }
  const hours = Math.floor(delta / HOUR_MS);
  const mins = Math.floor((delta - hours * HOUR_MS) / MIN_MS);
  return mins > 0 ? `IN ${hours}H ${mins}M` : `IN ${hours}H`;
}

function integrityColor(score: number, signalsMonitored: number): string {
  if (signalsMonitored === 0) return "var(--color-text-muted)";
  if (score < 70) return "var(--color-negative)";
  if (score < 85) return "var(--color-gold)";
  return "var(--color-text)";
}

export default function SentinelHero({
  watchStatus,
  className,
}: SentinelHeroProps): ReactElement {
  const {
    onWatchSince,
    nextScheduledScanAt,
    perimeterIntegrity,
    signalsMonitored,
  } = watchStatus;

  const hasOnWatchSince = Boolean(onWatchSince);
  const showDegradedScore =
    signalsMonitored === 0 && perimeterIntegrity === 100;

  const onWatchLeft: ReactElement = hasOnWatchSince ? (
    <time
      dateTime={onWatchSince}
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 11,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        color: "var(--color-text-muted)",
      }}
    >
      ON WATCH SINCE {formatWatchSinceDate(onWatchSince)}
    </time>
  ) : (
    <span
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 11,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        color: "var(--color-text-muted)",
      }}
    >
      SETTING UP WATCH
    </span>
  );

  const nextScanCenter: ReactElement = nextScheduledScanAt ? (
    <time
      dateTime={nextScheduledScanAt}
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 11,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        color: "var(--color-text-muted)",
      }}
    >
      NEXT SCAN {formatNextScan(nextScheduledScanAt)}
    </time>
  ) : (
    <span
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 11,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        color: "var(--color-text-muted)",
      }}
    >
      NEXT SCAN SOON
    </span>
  );

  const scoreLabel = showDegradedScore
    ? "Perimeter integrity is not yet established. Higher means fewer active signals."
    : `Perimeter integrity: ${perimeterIntegrity} out of 100. Higher means fewer active signals.`;

  const scoreValue = showDegradedScore ? "—" : String(perimeterIntegrity);

  const wrapperStyle: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: 20,
    paddingBottom: 24,
    borderBottom: "0.5px solid var(--color-border)",
  };

  const metadataStyle: CSSProperties = {
    display: "grid",
    gridTemplateColumns: "1fr auto 1fr",
    alignItems: "end",
    gap: 24,
    width: "100%",
  };

  return (
    <>
      <style>{`
        .illumin-sentinel-hero-title {
          font-family: var(--font-display);
          font-size: 32px;
          font-weight: 400;
          color: var(--color-text);
          margin: 0;
          line-height: 1.15;
          letter-spacing: -0.01em;
        }
        .illumin-sentinel-hero-subtitle {
          font-family: var(--font-sans);
          font-size: 14px;
          color: var(--color-text-mid);
          margin: 6px 0 0 0;
          line-height: 1.5;
        }
        .illumin-sentinel-hero-score-value {
          font-family: var(--font-mono);
          font-size: 32px;
          font-weight: 500;
          line-height: 1;
        }
        @media (max-width: 640px) {
          .illumin-sentinel-hero-title {
            font-size: 24px;
          }
          .illumin-sentinel-hero-score-value {
            font-size: 24px;
          }
          .illumin-sentinel-hero-metadata {
            grid-template-columns: 1fr !important;
            gap: 12px !important;
            text-align: left !important;
          }
          .illumin-sentinel-hero-metadata > * {
            text-align: left !important;
          }
        }
      `}</style>
      <header style={wrapperStyle} className={className}>
        <div>
          <h1 className="illumin-sentinel-hero-title">The Sentinel</h1>
          <p className="illumin-sentinel-hero-subtitle">
            What Illumin is watching on your behalf
          </p>
        </div>
        <div
          className="illumin-sentinel-hero-metadata"
          style={metadataStyle}
        >
          <div style={{ textAlign: "left" }}>{onWatchLeft}</div>
          <div style={{ textAlign: "center" }}>{nextScanCenter}</div>
          <div
            style={{
              textAlign: "right",
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              gap: 4,
            }}
            aria-label={scoreLabel}
          >
            <span
              className="illumin-sentinel-hero-score-value"
              style={{
                color: integrityColor(perimeterIntegrity, signalsMonitored),
              }}
            >
              {scoreValue}
            </span>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "var(--color-text-muted)",
              }}
            >
              /100 PERIMETER INTEGRITY
            </span>
          </div>
        </div>
      </header>
    </>
  );
}
