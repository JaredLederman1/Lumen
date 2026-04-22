"use client";

import type { CSSProperties, ReactElement } from "react";
import type { SignalThreshold } from "@/lib/types/vigilance";

interface Props {
  threshold: SignalThreshold;
  className?: string;
}

type PillKind = "urgent" | "flagged" | "ok";

function pillKind(t: SignalThreshold): PillKind {
  if (!t.inBreach) return "ok";
  // SignalThreshold has no annualValue field, so "urgent" is inferred from
  // how far the current value is from the threshold relative to the axis.
  // Past ~30% of the axis span → urgent. Good enough for the design-comparison
  // pass; the real severity signal will flow in with the detail wiring later.
  const span = Math.max(1e-9, t.axisMax - t.axisMin);
  const gap = Math.abs(t.currentValue - t.thresholdValue) / span;
  return gap > 0.3 ? "urgent" : "flagged";
}

function pillCopy(kind: PillKind): string {
  switch (kind) {
    case "urgent":
      return "URGENT";
    case "flagged":
      return "FLAGGED";
    case "ok":
      return "WITHIN BOUNDS";
  }
}

function pillColors(kind: PillKind): { bg: string; fg: string } {
  switch (kind) {
    case "urgent":
      return { bg: "var(--color-negative-bg)", fg: "var(--color-negative)" };
    case "flagged":
      return { bg: "var(--color-gold-subtle)", fg: "var(--color-gold)" };
    case "ok":
      return { bg: "var(--color-surface-2)", fg: "var(--color-text-muted)" };
  }
}

export default function ThresholdPill({ threshold: t, className }: Props): ReactElement {
  const kind = pillKind(t);
  const { bg, fg } = pillColors(kind);

  const readoutText = t.inBreach
    ? `${t.currentValueFormatted} · ${t.thresholdLabel}`
    : `${t.currentValueFormatted} · ${t.thresholdLabel}`;
  const readoutColor = t.inBreach ? "var(--color-negative)" : "var(--color-text-muted)";

  const rowStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 10,
    width: "100%",
    minWidth: 0,
  };

  const pillStyle: CSSProperties = {
    flex: "0 0 auto",
    height: 20,
    padding: "0 8px",
    borderRadius: "var(--radius-pill)",
    backgroundColor: bg,
    color: fg,
    fontFamily: "var(--font-mono)",
    fontSize: 10,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    display: "inline-flex",
    alignItems: "center",
    whiteSpace: "nowrap",
  };

  const labelStyle: CSSProperties = {
    flex: "0 0 auto",
    fontSize: 13,
    fontWeight: 500,
    color: "var(--color-text)",
    margin: 0,
    whiteSpace: "nowrap",
  };

  // Classic ledger-style dotted leader. A flex-grow span with a dotted bottom
  // border, lowered a few pixels to sit on the typographic baseline.
  const leaderStyle: CSSProperties = {
    flex: "1 1 auto",
    minWidth: 12,
    borderBottom: "1px dotted var(--color-border-strong)",
    marginBottom: 4,
    opacity: 0.7,
  };

  const readoutStyle: CSSProperties = {
    flex: "0 0 auto",
    fontFamily: "var(--font-mono)",
    fontSize: 11,
    color: readoutColor,
    whiteSpace: "nowrap",
  };

  return (
    <div
      className={className}
      style={rowStyle}
      role="group"
      aria-label={`${t.metricLabel}. ${pillCopy(kind)}. ${readoutText}.`}
    >
      <span style={pillStyle}>{pillCopy(kind)}</span>
      <p style={labelStyle}>{t.metricLabel}</p>
      <span aria-hidden="true" style={leaderStyle} />
      <span style={readoutStyle}>{readoutText}</span>
    </div>
  );
}
