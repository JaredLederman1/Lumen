"use client";

import type { CSSProperties, ReactElement } from "react";
import type { SignalThreshold } from "@/lib/types/vigilance";

interface Props {
  threshold: SignalThreshold;
  className?: string;
}

const BUCKETS = 7;
const DOT = 6;
const GAP = 8;

function bucketIndex(value: number, min: number, max: number): number {
  if (max <= min) return 0;
  const pct = (value - min) / (max - min);
  const idx = Math.floor(pct * BUCKETS);
  return Math.max(0, Math.min(BUCKETS - 1, idx));
}

function positionPct(value: number, min: number, max: number): number {
  if (max <= min) return 0;
  return Math.max(0, Math.min(1, (value - min) / (max - min))) * 100;
}

export default function ThresholdDots({ threshold: t, className }: Props): ReactElement {
  const currentBucket = bucketIndex(t.currentValue, t.axisMin, t.axisMax);
  const thresholdPosPct = positionPct(t.thresholdValue, t.axisMin, t.axisMax);
  const benchmarkBucket =
    t.benchmarkValue != null
      ? bucketIndex(t.benchmarkValue, t.axisMin, t.axisMax)
      : null;

  const fillColor = t.inBreach ? "var(--color-negative)" : "var(--color-positive)";

  const wrapperStyle: CSSProperties = { width: "100%" };

  const topRowStyle: CSSProperties = {
    display: "flex",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginBottom: 6,
  };

  const labelStyle: CSSProperties = {
    fontSize: 12,
    fontWeight: 500,
    color: "var(--color-text)",
    margin: 0,
  };

  const readoutStyle: CSSProperties = {
    fontFamily: "var(--font-mono)",
    fontSize: 11,
    color: t.inBreach ? "var(--color-negative)" : "var(--color-text-mid)",
    margin: 0,
  };

  const dotsRowStyle: CSSProperties = {
    position: "relative",
    display: "inline-flex",
    alignItems: "center",
    gap: GAP,
    padding: "4px 0",
  };

  const dotBase: CSSProperties = {
    width: DOT,
    height: DOT,
    borderRadius: "50%",
    boxSizing: "border-box",
  };

  // Threshold line sits between buckets at the exact threshold percentage.
  // Total row width = BUCKETS * DOT + (BUCKETS - 1) * GAP. Absolute left via
  // that pct keeps the line anchored to the data, not to bucket boundaries.
  const rowWidth = BUCKETS * DOT + (BUCKETS - 1) * GAP;
  const thresholdLineStyle: CSSProperties = {
    position: "absolute",
    top: -3,
    bottom: -3,
    left: (thresholdPosPct / 100) * rowWidth,
    width: 1,
    marginLeft: -0.5,
    backgroundColor: "var(--color-text-muted)",
    opacity: 0.5,
    pointerEvents: "none",
  };

  const bottomRowStyle: CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    marginTop: 4,
    fontFamily: "var(--font-mono)",
    fontSize: 9.5,
    color: "var(--color-text-muted)",
    width: rowWidth,
  };

  return (
    <div className={className} style={wrapperStyle}>
      <div style={topRowStyle}>
        <p style={labelStyle}>{t.metricLabel}</p>
        <p style={readoutStyle}>{t.currentValueFormatted}</p>
      </div>
      <div
        style={dotsRowStyle}
        role="meter"
        aria-valuenow={t.currentValue}
        aria-valuemin={t.axisMin}
        aria-valuemax={t.axisMax}
        aria-label={`${t.metricLabel}. Bucket ${currentBucket + 1} of ${BUCKETS}. ${t.inBreach ? "In breach." : "Within bounds."}`}
      >
        {Array.from({ length: BUCKETS }, (_, i) => {
          const isCurrent = i === currentBucket;
          const isBenchmark = benchmarkBucket != null && i === benchmarkBucket;
          const style: CSSProperties = isCurrent
            ? {
                ...dotBase,
                backgroundColor: fillColor,
                border: "none",
              }
            : {
                ...dotBase,
                backgroundColor: "transparent",
                border: "1px solid var(--color-text-muted)",
                opacity: 0.5,
              };
          return (
            <span key={i} style={style} aria-hidden="true">
              {isBenchmark && !isCurrent && (
                <span
                  style={{
                    display: "block",
                    width: DOT / 2,
                    height: DOT / 2,
                    margin: (DOT - DOT / 2) / 2 - 1,
                    borderRadius: "50%",
                    backgroundColor: "var(--color-info)",
                  }}
                />
              )}
            </span>
          );
        })}
        <span style={thresholdLineStyle} aria-hidden="true" />
      </div>
      <div style={bottomRowStyle}>
        <span>yours</span>
        {thresholdPosPct > 5 && thresholdPosPct < 95 ? (
          <span>threshold</span>
        ) : (
          <span />
        )}
        <span>{t.benchmarkLabel ? t.benchmarkLabel.split(" ")[0] : ""}</span>
      </div>
    </div>
  );
}
