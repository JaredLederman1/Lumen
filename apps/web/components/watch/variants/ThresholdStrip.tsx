"use client";

import type { CSSProperties, ReactElement } from "react";
import type { SignalThreshold } from "@/lib/types/vigilance";

interface Props {
  threshold: SignalThreshold;
  className?: string;
}

function norm(v: number, min: number, max: number): number {
  if (max <= min) return 0;
  return Math.max(0, Math.min(1, (v - min) / (max - min)));
}

export default function ThresholdStrip({ threshold: t, className }: Props): ReactElement {
  const currentPct = norm(t.currentValue, t.axisMin, t.axisMax) * 100;
  const thresholdPct = norm(t.thresholdValue, t.axisMin, t.axisMax) * 100;
  const breachPct = Math.min(
    100,
    norm(t.thresholdValue * 1.5, t.axisMin, t.axisMax) * 100,
  );

  // CSS gradient stops read crisper than SVG linearGradient at strip height
  // 10px on high-DPI screens, and needs no defs block.
  const gradient = `linear-gradient(to right,
    var(--color-positive-bg) 0%,
    var(--color-positive-bg) ${Math.max(0, thresholdPct - 15)}%,
    var(--color-gold-subtle) ${thresholdPct}%,
    var(--color-negative-bg) ${breachPct}%,
    var(--color-negative-bg) 100%)`;

  const wrapperStyle: CSSProperties = {
    width: "100%",
  };

  const topRowStyle: CSSProperties = {
    display: "flex",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginBottom: 4,
    gap: 12,
  };

  const labelStyle: CSSProperties = {
    fontSize: 12,
    fontWeight: 500,
    color: "var(--color-text)",
    margin: 0,
  };

  const readoutStyle: CSSProperties = {
    fontFamily: "var(--font-mono)",
    fontSize: 12,
    color: t.inBreach ? "var(--color-negative)" : "var(--color-text-mid)",
    margin: 0,
  };

  const stripStyle: CSSProperties = {
    position: "relative",
    height: 10,
    background: gradient,
    borderRadius: 2,
  };

  const tickStyle: CSSProperties = {
    position: "absolute",
    top: -2,
    bottom: -2,
    left: `${currentPct}%`,
    width: 3,
    marginLeft: -1.5,
    backgroundColor: "var(--color-text)",
    pointerEvents: "none",
  };

  return (
    <div className={className} style={wrapperStyle}>
      <div style={topRowStyle}>
        <p style={labelStyle}>{t.metricLabel}</p>
        <p style={readoutStyle}>{t.currentValueFormatted}</p>
      </div>
      <div
        style={stripStyle}
        role="meter"
        aria-valuenow={t.currentValue}
        aria-valuemin={t.axisMin}
        aria-valuemax={t.axisMax}
        aria-label={`${t.metricLabel}. ${t.currentValueFormatted}. ${t.inBreach ? "In breach." : "Within bounds."}`}
      >
        <div style={tickStyle} aria-hidden="true" />
      </div>
    </div>
  );
}
