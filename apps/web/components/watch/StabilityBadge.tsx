"use client";

import type { CSSProperties } from "react";
import type { SignalStateRecord, StabilityState } from "@/lib/types/vigilance";

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const YEAR_DAYS = 365;

const LABEL: Record<StabilityState, string> = {
  stable: "STABLE",
  flagged: "FLAGGED",
  widening: "WIDENING",
  narrowing: "NARROWING",
  resolved_recent: "RESOLVED",
};

const COLOR: Record<StabilityState, string> = {
  stable: "var(--color-positive)",
  flagged: "var(--color-negative)",
  widening: "var(--color-negative)",
  narrowing: "var(--color-positive)",
  resolved_recent: "var(--color-text-muted)",
};

function daysSince(iso: string): number {
  const delta = Date.now() - new Date(iso).getTime()
  if (!Number.isFinite(delta) || delta < 0) return 0
  return Math.floor(delta / DAY_MS)
}

function formatDuration(days: number): string {
  if (days < 1) return "today"
  if (days >= YEAR_DAYS) {
    const years = Math.floor(days / YEAR_DAYS)
    return `${years}y+`
  }
  return `${days}d`
}

function formatRelative(iso: string): string {
  const delta = Date.now() - new Date(iso).getTime()
  if (!Number.isFinite(delta)) return "just now"
  if (delta < 2 * MINUTE_MS) return "just now"
  if (delta < HOUR_MS) {
    const minutes = Math.max(1, Math.floor(delta / MINUTE_MS))
    return `${minutes}m ago`
  }
  if (delta < DAY_MS) {
    const hours = Math.max(1, Math.floor(delta / HOUR_MS))
    return `${hours}h ago`
  }
  const days = Math.max(1, Math.floor(delta / DAY_MS))
  return `${days}d ago`
}

export interface StabilityBadgeProps {
  state?: SignalStateRecord | null;
  /**
   * When provided, used for the screen-reader label so assistive tech can
   * read e.g. "Net worth stability: stable 39 days". The visible badge stays
   * minimal.
   */
  ariaContextLabel?: string;
}

export default function StabilityBadge({ state, ariaContextLabel }: StabilityBadgeProps) {
  if (!state) return null

  const style: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    fontFamily: "var(--font-mono)",
    fontSize: 10,
    letterSpacing: "0.04em",
    color: COLOR[state.currentState],
    lineHeight: 1,
  }

  const label = LABEL[state.currentState]
  const detail = deriveDetail(state)
  const visible = detail ? `${label} ${detail}` : label

  const aria = ariaContextLabel
    ? `${ariaContextLabel}: ${visible.toLowerCase()}`
    : visible.toLowerCase()

  return (
    <span role="status" aria-label={aria} style={style}>
      {visible}
    </span>
  )
}

function deriveDetail(state: SignalStateRecord): string | null {
  const { currentState, stateSince, stabilityDays, lastCheckedAt } = state

  // Prefer the server-provided stabilityDays, but fall back to stateSince
  // when it is absent or clearly wrong (null / future clock skew).
  const derivedDays = Math.max(0, stabilityDays ?? daysSince(stateSince))

  switch (currentState) {
    case "stable":
    case "narrowing":
    case "widening":
    case "resolved_recent":
      return formatDuration(derivedDays)
    case "flagged":
      // Compact middle dot (·) instead of an em dash, per copy rules.
      return `· ${formatRelative(lastCheckedAt ?? stateSince)}`
    default:
      return null
  }
}
