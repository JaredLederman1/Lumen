"use client";

import { useMemo, type CSSProperties, type ReactElement } from "react";
import type { SignalThreshold } from "@/lib/types/vigilance";

interface Props {
  threshold: SignalThreshold;
  className?: string;
}

const W = 240;
const H = 40;
const DAYS = 14;

function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function seededUnit(seed: number, salt: number): number {
  const mixed = Math.imul(seed ^ salt, 0x85ebca6b) >>> 0;
  return (mixed % 10000) / 10000;
}

function norm(v: number, min: number, max: number): number {
  if (max <= min) return 0;
  return Math.max(0, Math.min(1, (v - min) / (max - min)));
}

function toSvgY(v: number, min: number, max: number): number {
  return H - norm(v, min, max) * H;
}

function buildTrajectory(t: SignalThreshold): {
  values: number[];
  pastValue: number;
} {
  const h = hashString(t.gapId);
  const amplitude = (t.axisMax - t.axisMin) * 0.15;
  const dir = seededUnit(h, 1) > 0.5 ? 1 : -1;
  const pastValue = Math.max(
    t.axisMin,
    Math.min(t.axisMax, t.currentValue + dir * amplitude),
  );
  const values: number[] = [];
  for (let i = 0; i < DAYS; i++) {
    const ratio = i / (DAYS - 1);
    const baseValue = pastValue + (t.currentValue - pastValue) * ratio;
    const noise = (seededUnit(h, i + 10) - 0.5) * amplitude * 0.4;
    values.push(baseValue + noise);
  }
  values[DAYS - 1] = t.currentValue;
  return { values, pastValue };
}

function formatForReadout(t: SignalThreshold, value: number): string {
  // Preserve the formatting intent of currentValueFormatted (whether it has
  // a percent, dollar-per-month, etc. suffix) by stripping the number and
  // re-inserting the one we want.
  const formatted = t.currentValueFormatted;
  const leadingPrefixMatch = formatted.match(/^([^\d\-\.]*)/);
  const trailingMatch = formatted.match(/([^\d\-\.]*)$/);
  const prefix = leadingPrefixMatch?.[1] ?? "";
  const suffix = trailingMatch?.[1] ?? "";
  const rounded = Math.abs(value) >= 100
    ? Math.round(value).toString()
    : value.toFixed(1).replace(/\.0$/, "");
  return `${prefix}${rounded}${suffix}`;
}

export default function ThresholdTrajectory({ threshold: t, className }: Props): ReactElement {
  const { values, pastValue } = useMemo(() => buildTrajectory(t), [t]);

  const points = values.map((v, i) => ({
    x: (i / (DAYS - 1)) * W,
    y: toSvgY(v, t.axisMin, t.axisMax),
  }));

  const thresholdY = toSvgY(t.thresholdValue, t.axisMin, t.axisMax);

  // Breach side: the side of threshold where the current value sits. When
  // the trajectory strays to that side and inBreach is true, we fill the
  // region between the line and the threshold to read as "drift into danger."
  const breachBelow = t.currentValue < t.thresholdValue;
  const shouldFill = t.inBreach;

  const clippedY = points.map(p => {
    if (!shouldFill) return thresholdY;
    if (breachBelow && p.y > thresholdY) return p.y; // below threshold on screen = bigger y
    if (!breachBelow && p.y < thresholdY) return p.y;
    return thresholdY;
  });

  const fillPath =
    `M 0 ${thresholdY} ` +
    points.map((p, i) => `L ${p.x} ${clippedY[i]}`).join(" ") +
    ` L ${W} ${thresholdY} Z`;

  const linePath =
    `M ${points[0].x} ${points[0].y} ` +
    points
      .slice(1)
      .map(p => `L ${p.x} ${p.y}`)
      .join(" ");

  const lineColor = t.inBreach ? "var(--color-negative)" : "var(--color-positive)";

  const wrapperStyle: CSSProperties = { width: "100%" };

  const topRowStyle: CSSProperties = {
    display: "flex",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginBottom: 4,
  };

  const labelStyle: CSSProperties = {
    fontSize: 12,
    fontWeight: 500,
    color: "var(--color-text)",
    margin: 0,
  };

  const driftStyle: CSSProperties = {
    fontFamily: "var(--font-mono)",
    fontSize: 10,
    color: "var(--color-text-muted)",
    margin: 0,
  };

  const sparkStyle: CSSProperties = {
    width: "100%",
    height: H,
    display: "block",
  };

  const bottomStyle: CSSProperties = {
    fontFamily: "var(--font-mono)",
    fontSize: 10,
    color: "var(--color-text-muted)",
    marginTop: 3,
  };

  return (
    <div className={className} style={wrapperStyle}>
      <div style={topRowStyle}>
        <p style={labelStyle}>{t.metricLabel}</p>
        <p style={driftStyle}>14d drift</p>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        style={sparkStyle}
        role="img"
        aria-label={`${t.metricLabel}. 14-day trajectory. ${t.inBreach ? "In breach." : "Within bounds."}`}
      >
        {shouldFill && (
          <path d={fillPath} fill="var(--color-negative)" fillOpacity={0.2} />
        )}
        <line
          x1={0}
          x2={W}
          y1={thresholdY}
          y2={thresholdY}
          stroke="var(--color-text-muted)"
          strokeWidth={0.75}
          strokeDasharray="2 3"
          opacity={0.7}
        />
        <path
          d={linePath}
          fill="none"
          stroke={lineColor}
          strokeWidth={1.25}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <circle
          cx={points[points.length - 1].x}
          cy={points[points.length - 1].y}
          r={2}
          fill={lineColor}
        />
      </svg>
      <p style={bottomStyle}>
        was {formatForReadout(t, pastValue)} · now {t.currentValueFormatted}
      </p>
    </div>
  );
}
