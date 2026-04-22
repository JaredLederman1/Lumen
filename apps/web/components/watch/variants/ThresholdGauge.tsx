"use client";

import type { CSSProperties, ReactElement } from "react";
import type { SignalThreshold } from "@/lib/types/vigilance";

interface Props {
  threshold: SignalThreshold;
  className?: string;
}

const W = 120;
const H = 70;
const CX = W / 2;
const CY = H - 8;
const R = 50;
const STROKE = 6;

function norm(v: number, min: number, max: number): number {
  if (max <= min) return 0;
  return Math.max(0, Math.min(1, (v - min) / (max - min)));
}

// pos in [0,1]; returns SVG angle in radians where π is left, 0 is right,
// passing through π/2 at the top of the gauge.
function angleFor(pos: number): number {
  return Math.PI * (1 - pos);
}

function pt(angle: number, r = R) {
  return {
    x: CX + r * Math.cos(angle),
    y: CY - r * Math.sin(angle),
  };
}

function arcPath(from: number, to: number): string {
  const a = pt(from);
  const b = pt(to);
  const large = Math.abs(from - to) > Math.PI ? 1 : 0;
  // Sweep=1 traces the upper semicircle when `from` is the larger angle.
  // All sub-arcs here start at a larger angle than they end, so this is
  // the consistent direction.
  return `M ${a.x} ${a.y} A ${R} ${R} 0 ${large} 1 ${b.x} ${b.y}`;
}

export default function ThresholdGauge({ threshold: t, className }: Props): ReactElement {
  const currentPos = norm(t.currentValue, t.axisMin, t.axisMax);
  const thresholdPos = norm(t.thresholdValue, t.axisMin, t.axisMax);
  const breachPos = Math.min(1, norm(t.thresholdValue * 1.5, t.axisMin, t.axisMax));

  const angStart = angleFor(0);          // axisMin → π
  const angThreshold = angleFor(thresholdPos);
  const angBreach = angleFor(breachPos);
  const angEnd = angleFor(1);            // axisMax → 0

  // The three zones are drawn left → right. Tradeoff: this assumes higher
  // value = further into breach. For metrics like cash_yield where lower is
  // worse, the needle will read as pointing to the "safe" color even though
  // inBreach is true. Documented for the design-comparison pass.
  const safe = arcPath(angStart, angThreshold);
  const warn = arcPath(angThreshold, angBreach);
  const breach = arcPath(angBreach, angEnd);

  const tip = pt(angleFor(currentPos));

  const containerStyle: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 4,
  };

  const labelStyle: CSSProperties = {
    fontSize: 12,
    fontWeight: 500,
    color: "var(--color-text)",
    margin: 0,
    textAlign: "center",
  };

  const valueStyle: CSSProperties = {
    fontFamily: "var(--font-mono)",
    fontSize: 14,
    fontWeight: 500,
    color: t.inBreach ? "var(--color-negative)" : "var(--color-text)",
    margin: 0,
    lineHeight: 1,
  };

  return (
    <div className={className} style={containerStyle}>
      <svg
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`${t.metricLabel} gauge. ${t.currentValueFormatted}. ${t.inBreach ? "In breach." : "Within bounds."}`}
      >
        <path
          d={safe}
          fill="none"
          stroke="var(--color-positive-bg)"
          strokeWidth={STROKE}
          strokeLinecap="butt"
        />
        <path
          d={warn}
          fill="none"
          stroke="var(--color-gold-subtle)"
          strokeWidth={STROKE}
          strokeLinecap="butt"
        />
        <path
          d={breach}
          fill="none"
          stroke="var(--color-negative-bg)"
          strokeWidth={STROKE}
          strokeLinecap="butt"
        />
        {/* Needle halo — wider stroke behind the needle for a soft tip glow. */}
        <line
          x1={CX}
          y1={CY}
          x2={tip.x}
          y2={tip.y}
          stroke={t.inBreach ? "var(--color-negative)" : "var(--color-text)"}
          strokeOpacity={0.2}
          strokeWidth={6}
          strokeLinecap="round"
        />
        <line
          x1={CX}
          y1={CY}
          x2={tip.x}
          y2={tip.y}
          stroke={t.inBreach ? "var(--color-negative)" : "var(--color-text)"}
          strokeWidth={2}
          strokeLinecap="round"
        />
        <circle cx={CX} cy={CY} r={3} fill="var(--color-text)" />
        <circle cx={tip.x} cy={tip.y} r={2} fill={t.inBreach ? "var(--color-negative)" : "var(--color-text)"} />
      </svg>
      <p style={labelStyle}>{t.metricLabel}</p>
      <p style={valueStyle}>{t.currentValueFormatted}</p>
    </div>
  );
}
