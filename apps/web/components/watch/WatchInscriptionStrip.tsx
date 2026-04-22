"use client";

import type { CSSProperties } from "react";
import type { WatchStatus } from "@/lib/types/vigilance";
import {
  formatRelativeScan,
  useMockWatchStatus,
  type MockScenario,
} from "@/lib/vigilance/mockWatchStatus";

const HOUR_MS = 60 * 60 * 1000;

type DotTone = "active" | "stale" | "failed" | "idle";

interface Props {
  status?: WatchStatus | null;
  isError?: boolean;
  scenario?: MockScenario;
}

type Resolved =
  | { kind: "loading" }
  | { kind: "fresh" }
  | { kind: "failed" }
  | { kind: "stale"; status: WatchStatus }
  | { kind: "active"; status: WatchStatus };

function resolveState(status: WatchStatus | null, isError: boolean): Resolved {
  if (isError) return { kind: "failed" };
  if (status === null) return { kind: "loading" };
  if (status.signalsMonitored === 0) return { kind: "fresh" };

  const lastMs = status.lastScanAt
    ? new Date(status.lastScanAt).getTime()
    : null;
  const age = lastMs === null ? Infinity : Date.now() - lastMs;

  if (age > 24 * HOUR_MS) return { kind: "failed" };
  if (age > 6 * HOUR_MS) return { kind: "stale", status };
  return { kind: "active", status };
}

const DOT_COLOR: Record<DotTone, string> = {
  active: "var(--color-positive)",
  stale: "var(--color-gold)",
  failed: "var(--color-negative)",
  idle: "var(--color-text-muted)",
};

export default function WatchInscriptionStrip({
  status,
  isError = false,
  scenario,
}: Props) {
  const mock = useMockWatchStatus(scenario ?? "active");
  const effectiveStatus =
    status !== undefined ? status : scenario ? mock.data : mock.data;
  const effectiveError = isError || (scenario ? mock.isError : false);

  const resolved = resolveState(effectiveStatus ?? null, effectiveError);

  let dotTone: DotTone;
  let leftText: string;
  let rightText: string | null = null;
  let rightTone: "primary" | "muted" = "muted";
  let pulse = true;

  switch (resolved.kind) {
    case "loading":
      dotTone = "idle";
      leftText = "Posting the watch...";
      break;
    case "fresh":
      dotTone = "active";
      leftText = "Setting up the watchtower...";
      break;
    case "failed":
      dotTone = "failed";
      leftText = "ON WATCH · paused · retry soon";
      pulse = false;
      break;
    case "stale": {
      const s = resolved.status;
      dotTone = "stale";
      const rel = s.lastScanAt ? formatRelativeScan(s.lastScanAt) : "pending";
      leftText = `ON WATCH · ${s.signalsMonitored} signals monitored · last scan ${rel} · scan overdue`;
      if (s.signalsNew > 0) {
        rightText = `${s.signalsNew} new`;
        rightTone = "primary";
      } else {
        rightText = "all quiet";
      }
      break;
    }
    case "active": {
      const s = resolved.status;
      dotTone = "active";
      const rel = s.lastScanAt ? formatRelativeScan(s.lastScanAt) : "pending";
      leftText = `ON WATCH · ${s.signalsMonitored} signals monitored · last scan ${rel}`;
      if (s.signalsNew > 0) {
        rightText = `${s.signalsNew} new`;
        rightTone = "primary";
      } else {
        rightText = "all quiet";
      }
      break;
    }
  }

  const stripStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    width: "100%",
    minHeight: 32,
    padding: "8px 24px",
    backgroundColor: "var(--color-surface)",
    borderBottom: "0.5px solid var(--color-border)",
    fontFamily: "var(--font-mono)",
    fontSize: 11,
    letterSpacing: "0.04em",
    lineHeight: 1.3,
  };

  const leftStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 10,
    minWidth: 0,
    flex: "1 1 auto",
  };

  const dotStyle: CSSProperties = {
    display: "inline-block",
    width: 6,
    height: 6,
    borderRadius: "50%",
    backgroundColor: DOT_COLOR[dotTone],
    flex: "0 0 auto",
    animation: pulse
      ? "illumin-watch-pulse 2.4s ease-in-out infinite"
      : "none",
  };

  const leftTextStyle: CSSProperties = {
    color: "var(--color-text-muted)",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    minWidth: 0,
  };

  const rightStyle: CSSProperties = {
    color:
      rightTone === "primary"
        ? "var(--color-text)"
        : "var(--color-text-muted)",
    fontWeight: rightTone === "primary" ? 500 : 400,
    flex: "0 0 auto",
  };

  return (
    <>
      <style>{`
        @keyframes illumin-watch-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.45; }
        }
        @media (max-width: 379px) {
          .illumin-watch-strip {
            flex-wrap: wrap;
            padding: 6px 14px !important;
          }
          .illumin-watch-strip .illumin-watch-left {
            flex: 1 1 100%;
          }
          .illumin-watch-strip .illumin-watch-right {
            flex: 1 1 100%;
            text-align: left;
          }
        }
      `}</style>
      <div
        className="illumin-watch-strip"
        role="status"
        aria-live="polite"
        style={stripStyle}
      >
        <div className="illumin-watch-left" style={leftStyle}>
          <span aria-hidden="true" style={dotStyle} />
          <span style={leftTextStyle}>{leftText}</span>
        </div>
        {rightText !== null && (
          <span className="illumin-watch-right" style={rightStyle}>
            {rightText}
          </span>
        )}
      </div>
    </>
  );
}
