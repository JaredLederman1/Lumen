"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactElement,
} from "react";
import type { Signal, SignalDomain, SignalSeverity } from "@/lib/types/vigilance";
import {
  getRingBoundaries,
  getRingForDomain,
  getSignalAngle,
  polarToCartesian,
  quadrantOf,
  type PerimeterRing,
} from "@/lib/vigilance/perimeterMath";
import styles from "./PerimeterSVG.module.css";

export interface PerimeterSVGProps {
  cashAmount: number;
  signals: Signal[];
  size?: number;
  onSignalClick?: (signal: Signal) => void;
  onRingClick?: (ring: PerimeterRing) => void;
  className?: string;
}

const DEFAULT_SIZE = 400;
const MOBILE_SIZE = 280;
const MOBILE_BREAKPOINT = 480;

const RING_LABEL: Record<PerimeterRing, string> = {
  cash: "CASH",
  short_term: "SHORT-TERM",
  long_term: "LONG-TERM",
  aspirational: "ASPIRATIONAL",
};

const DOMAIN_HUMAN: Record<SignalDomain, string> = {
  idle_cash: "Idle cash drag",
  hysa: "HYSA yield gap",
  debt: "High-APR debt",
  match: "Employer match gap",
  tax_advantaged: "Tax-advantaged capacity",
  benefits: "Benefits capacity",
};

function severityColor(severity: SignalSeverity): string {
  switch (severity) {
    case "urgent":
      return "var(--color-negative)";
    case "flagged":
      return "var(--color-gold)";
    case "advisory":
      return "var(--color-text-muted)";
  }
}

function severityRadius(severity: SignalSeverity): number {
  return severity === "advisory" ? 4 : 5;
}

function severityHaloRadius(severity: SignalSeverity): number | null {
  switch (severity) {
    case "urgent":
      return 10;
    case "flagged":
      return 8;
    case "advisory":
      return null;
  }
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function signalHeadline(signal: Signal): string {
  const label = (signal.payload as { label?: string } | null)?.label;
  if (label && typeof label === "string") return label;
  return DOMAIN_HUMAN[signal.domain];
}

function severityTagStyle(severity: SignalSeverity): CSSProperties {
  return {
    fontFamily: "var(--font-mono)",
    fontSize: 9,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    fill: severityColor(severity),
  };
}

interface PlacedSignal {
  signal: Signal;
  ring: Exclude<PerimeterRing, "cash">;
  x: number;
  y: number;
  angleRadians: number;
}

function useResponsiveSize(sizeProp: number | undefined): number {
  const base = sizeProp ?? DEFAULT_SIZE;
  // SSR renders the base size; the client effect swaps to mobile if needed.
  // Starting SSR with the base avoids hydration mismatches.
  const [width, setWidth] = useState<number>(base);
  useEffect(() => {
    const listener = () => setWidth(window.innerWidth);
    listener();
    window.addEventListener("resize", listener);
    return () => window.removeEventListener("resize", listener);
  }, []);
  if (sizeProp) return sizeProp;
  return width < MOBILE_BREAKPOINT ? MOBILE_SIZE : base;
}

export default function PerimeterSVG({
  cashAmount,
  signals,
  size: sizeProp,
  onSignalClick,
  onRingClick,
  className,
}: PerimeterSVGProps): ReactElement {
  const size = useResponsiveSize(sizeProp);
  const center = size / 2;
  const boundaries = getRingBoundaries(size);

  const [hoveredRing, setHoveredRing] = useState<PerimeterRing | null>(null);
  const [hoveredSignalId, setHoveredSignalId] = useState<string | null>(null);

  const placed: PlacedSignal[] = useMemo(() => {
    return signals.map(signal => {
      const ring = getRingForDomain(signal.domain);
      const radius =
        ring === "short_term"
          ? boundaries.ring1
          : ring === "long_term"
            ? boundaries.ring2
            : boundaries.ring3;
      const angle = getSignalAngle(signal.gapId);
      const pt = polarToCartesian(center, center, radius, angle);
      return { signal, ring, x: pt.x, y: pt.y, angleRadians: angle };
    });
  }, [signals, boundaries.ring1, boundaries.ring2, boundaries.ring3, center]);

  const counts = useMemo(() => {
    let flagged = 0;
    let urgent = 0;
    for (const s of signals) {
      if (s.severity === "flagged") flagged += 1;
      if (s.severity === "urgent") urgent += 1;
    }
    return { flagged, urgent };
  }, [signals]);

  const ariaLabel =
    signals.length === 0
      ? `Perimeter view. All quiet. Cash position: ${formatCurrency(cashAmount)}.`
      : `Perimeter view. ${signals.length} signals being watched: ${counts.flagged} flagged, ${counts.urgent} urgent. Cash position: ${formatCurrency(cashAmount)}.`;

  const describe = useMemo(() => {
    if (signals.length === 0) {
      return `No active signals. Cash on hand: ${formatCurrency(cashAmount)}.`;
    }
    const byRing: Record<Exclude<PerimeterRing, "cash">, number> = {
      short_term: 0,
      long_term: 0,
      aspirational: 0,
    };
    for (const p of placed) byRing[p.ring] += 1;
    return [
      `Cash on hand: ${formatCurrency(cashAmount)}.`,
      `Short-term ring: ${byRing.short_term} signals.`,
      `Long-term ring: ${byRing.long_term} signals.`,
      `Aspirational ring: ${byRing.aspirational} signals.`,
    ].join(" ");
  }, [placed, signals.length, cashAmount]);

  const activeSignal =
    hoveredSignalId != null
      ? placed.find(p => p.signal.id === hoveredSignalId) ?? null
      : null;

  const handleSignalKey = useCallback(
    (event: KeyboardEvent<SVGCircleElement>, signal: Signal) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onSignalClick?.(signal);
      }
    },
    [onSignalClick],
  );

  const containerStyle: CSSProperties = {
    position: "relative",
    display: "inline-block",
    width: size,
    height: size,
  };

  const svgClassName = hoveredRing ? styles.rootHovered : undefined;

  return (
    <div style={containerStyle} className={className}>
      <svg
        role="img"
        aria-label={ariaLabel}
        viewBox={`0 0 ${size} ${size}`}
        width={size}
        height={size}
        className={svgClassName}
        style={{ display: "block", overflow: "visible" }}
      >
        <desc>{describe}</desc>

        {/* Aspirational ring (outermost, dashed). Rendered first so inner rings
         * and dots paint on top if anything ever overlaps. */}
        <circle
          cx={center}
          cy={center}
          r={boundaries.ring3}
          fill="none"
          stroke="var(--color-border)"
          strokeOpacity={0.55}
          strokeWidth={0.75}
          strokeDasharray="2 3"
          className={`${styles.ring} ${hoveredRing === "aspirational" ? styles.ringActive : ""}`}
          onMouseEnter={() => setHoveredRing("aspirational")}
          onMouseLeave={() => setHoveredRing(null)}
          onClick={() => onRingClick?.("aspirational")}
          style={{ cursor: onRingClick ? "pointer" : "default" }}
        />

        <circle
          cx={center}
          cy={center}
          r={boundaries.ring2}
          fill="none"
          stroke="var(--color-border)"
          strokeWidth={0.75}
          className={`${styles.ring} ${hoveredRing === "long_term" ? styles.ringActive : ""}`}
          onMouseEnter={() => setHoveredRing("long_term")}
          onMouseLeave={() => setHoveredRing(null)}
          onClick={() => onRingClick?.("long_term")}
          style={{ cursor: onRingClick ? "pointer" : "default" }}
        />

        <circle
          cx={center}
          cy={center}
          r={boundaries.ring1}
          fill="none"
          stroke="var(--color-border-strong)"
          strokeWidth={0.75}
          className={`${styles.ring} ${hoveredRing === "short_term" ? styles.ringActive : ""}`}
          onMouseEnter={() => setHoveredRing("short_term")}
          onMouseLeave={() => setHoveredRing(null)}
          onClick={() => onRingClick?.("short_term")}
          style={{ cursor: onRingClick ? "pointer" : "default" }}
        />

        {/* Center cash disc. Subtle fill; stroke does the work. */}
        <circle
          cx={center}
          cy={center}
          r={boundaries.cashRadius}
          fill="var(--color-surface-2)"
          fillOpacity={0.06}
          stroke="var(--color-border-strong)"
          strokeWidth={1}
          className={`${styles.ring} ${hoveredRing === "cash" ? styles.ringActive : ""}`}
          onMouseEnter={() => setHoveredRing("cash")}
          onMouseLeave={() => setHoveredRing(null)}
          onClick={() => onRingClick?.("cash")}
          style={{ cursor: onRingClick ? "pointer" : "default" }}
        />

        {/* Center labels. Stacked with small vertical rhythm. */}
        <text
          x={center}
          y={center - 4}
          textAnchor="middle"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 9,
            letterSpacing: "0.05em",
            fill: "var(--color-text-mid)",
          }}
        >
          {RING_LABEL.cash}
        </text>
        <text
          x={center}
          y={center + 10}
          textAnchor="middle"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            fontWeight: 500,
            fill: "var(--color-text)",
          }}
        >
          {formatCurrency(cashAmount)}
        </text>

        {/* Ring hover labels. Positioned above each ring's apex. */}
        {(["short_term", "long_term", "aspirational"] as const).map(ring => {
          const ringRadius =
            ring === "short_term"
              ? boundaries.ring1
              : ring === "long_term"
                ? boundaries.ring2
                : boundaries.ring3;
          return (
            <text
              key={ring}
              x={center}
              y={center - ringRadius - 6}
              textAnchor="middle"
              aria-live="polite"
              className={`${styles.ringLabel} ${hoveredRing === ring ? styles.ringLabelVisible : ""}`}
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 9,
                letterSpacing: "0.08em",
                fill: "var(--color-text-mid)",
              }}
            >
              {RING_LABEL[ring]}
            </text>
          );
        })}

        {/* Signal halos. Drawn before dots so dots sit on top. */}
        {placed.map(({ signal, x, y }) => {
          const halo = severityHaloRadius(signal.severity);
          if (!halo) return null;
          const isUrgent = signal.severity === "urgent";
          return (
            <circle
              key={`halo-${signal.id}`}
              cx={x}
              cy={y}
              r={halo}
              fill={severityColor(signal.severity)}
              fillOpacity={0.2}
              stroke="none"
              className={isUrgent ? styles.urgentHalo : ""}
              aria-hidden="true"
              style={{ pointerEvents: "none" }}
            />
          );
        })}

        {/* Signal dots. Focusable, keyboard-activatable, positioned per gapId. */}
        {placed.map(({ signal, ring, x, y }) => {
          const r = severityRadius(signal.severity);
          const onActiveRing = hoveredRing === ring;
          const headline = signalHeadline(signal);
          const aria = `${headline}. ${formatCurrency(signal.annualValue)} per year. ${signal.severity}.`;
          return (
            <circle
              key={signal.id}
              cx={x}
              cy={y}
              r={r}
              fill={severityColor(signal.severity)}
              role="button"
              tabIndex={0}
              aria-label={aria}
              className={`${styles.signalDot} ${onActiveRing ? styles.signalDotOnActiveRing : ""}`}
              onMouseEnter={() => setHoveredSignalId(signal.id)}
              onMouseLeave={() => setHoveredSignalId(prev => (prev === signal.id ? null : prev))}
              onFocus={() => setHoveredSignalId(signal.id)}
              onBlur={() => setHoveredSignalId(prev => (prev === signal.id ? null : prev))}
              onClick={() => onSignalClick?.(signal)}
              onKeyDown={event => handleSignalKey(event, signal)}
            />
          );
        })}

        {/* Tooltip for the hovered/focused signal. Quadrant-based placement so
         * it stays inside the SVG box without measuring text width. */}
        {activeSignal && (
          <SignalTooltip
            placement={quadrantOf({ x: activeSignal.x, y: activeSignal.y }, { x: center, y: center })}
            x={activeSignal.x}
            y={activeSignal.y}
            signal={activeSignal.signal}
          />
        )}

        {/* Bottom perimeter caption. */}
        <text
          x={center}
          y={size - 6}
          textAnchor="middle"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 8.5,
            letterSpacing: "0.08em",
            fill: "var(--color-text-muted)",
          }}
        >
          PERIMETER
        </text>
      </svg>
    </div>
  );
}

interface TooltipProps {
  signal: Signal;
  x: number;
  y: number;
  placement: { horizontal: "left" | "right"; vertical: "top" | "bottom" };
}

const TOOLTIP_WIDTH = 168;
const TOOLTIP_HEIGHT = 58;
const TOOLTIP_GAP = 10;

function SignalTooltip({ signal, x, y, placement }: TooltipProps): ReactElement {
  const headline = signalHeadline(signal);
  const annual = formatCurrency(signal.annualValue);
  const severityLabel = signal.severity.toUpperCase();

  // If the dot is on the right half, put the tooltip to its left; same for
  // top/bottom. This keeps the tooltip inside the SVG bounds without having
  // to measure actual text width.
  const anchorX =
    placement.horizontal === "right" ? x - TOOLTIP_WIDTH - TOOLTIP_GAP : x + TOOLTIP_GAP;
  const anchorY =
    placement.vertical === "top" ? y + TOOLTIP_GAP : y - TOOLTIP_HEIGHT - TOOLTIP_GAP;

  return (
    <g pointerEvents="none" aria-hidden="true">
      <rect
        x={anchorX}
        y={anchorY}
        width={TOOLTIP_WIDTH}
        height={TOOLTIP_HEIGHT}
        rx={6}
        ry={6}
        fill="var(--color-surface-elevated)"
        stroke="var(--color-border-strong)"
        strokeWidth={0.75}
      />
      <text
        x={anchorX + 12}
        y={anchorY + 18}
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          fill: "var(--color-text)",
        }}
      >
        {headline}
      </text>
      <text
        x={anchorX + 12}
        y={anchorY + 34}
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          fill: "var(--color-text-mid)",
        }}
      >
        {annual}
        <tspan dx="8" style={{ fill: "var(--color-text-muted)" }}>
          /yr
        </tspan>
      </text>
      <text x={anchorX + 12} y={anchorY + 48} style={severityTagStyle(signal.severity)}>
        {severityLabel}
      </text>
    </g>
  );
}
