/**
 * Vigilance system type contract.
 *
 * Shared between the detection layer (scan endpoint, recovery.ts, watch APIs)
 * and the UI layer (dashboard, watch log, threshold bars). Do not import
 * Prisma types here — these are the wire format for API responses, which may
 * diverge from DB column types over time.
 */

export type SignalDomain =
  | "idle_cash"
  | "hysa"
  | "debt"
  | "match"
  | "benefits"
  | "tax_advantaged"
  | "subscription"
  | "category_overspend"
  | "recurring_change";

export type SignalState =
  | "new"
  | "active"
  | "acknowledged"
  | "acted"
  | "resolved"
  | "stale";

export type SignalSeverity = "advisory" | "flagged" | "urgent";

export type StabilityState =
  | "stable"
  | "flagged"
  | "widening"
  | "narrowing"
  | "resolved_recent";

export type ScanTrigger =
  | "scheduled"
  | "app_open"
  | "manual"
  | "post_sync";

export type ScanStatus =
  | "running"
  | "completed"
  | "failed"
  | "partial";

/**
 * A single detected financial condition. One per (user, gapId) pair; state
 * evolves over time rather than creating new rows per scan.
 */
export interface Signal {
  id: string;
  gapId: string;
  domain: SignalDomain;
  state: SignalState;
  severity: SignalSeverity;
  annualValue: number;
  lifetimeValue: number | null;
  payload: Record<string, unknown> | null;
  firstDetectedAt: string; // ISO 8601
  lastSeenAt: string;
  acknowledgedAt: string | null;
  actedAt: string | null;
  resolvedAt: string | null;
}

/**
 * Per-gap stability tracking. Exists for ALL monitored gaps, including ones
 * not currently flagged. Powers "STABLE 39d" / "WIDENING 6d" badges.
 */
export interface SignalStateRecord {
  gapId: string;
  currentState: StabilityState;
  stateSince: string;
  previousState: StabilityState | null;
  lastCheckedAt: string;
  lastValue: number | null;
  previousValue: number | null;
  stabilityDays: number; // derived: days since stateSince
}

/**
 * Summary of a single scan run.
 */
export interface Scan {
  id: string;
  startedAt: string;
  completedAt: string | null;
  status: ScanStatus;
  trigger: ScanTrigger;
  signalsChecked: number;
  signalsFlagged: number;
  signalsResolved: number;
  errorMessage: string | null;
}

/**
 * A single entry in the watch log. Unified view combining signal events and
 * routine scan completions so the log always has content even on quiet days.
 */
export type WatchLogEntry =
  | {
      type: "signal_new";
      timestamp: string;
      signal: Signal;
    }
  | {
      type: "signal_widened";
      timestamp: string;
      signal: Signal;
      deltaAnnualValue: number;
    }
  | {
      type: "signal_resolved";
      timestamp: string;
      signal: Signal;
    }
  | {
      type: "scan_completed";
      timestamp: string;
      scan: Scan;
    };

/**
 * Response from /api/watch/status. Drives the header inscription strip and
 * the "on watch since" badge.
 */
export interface WatchStatus {
  onWatchSince: string; // ISO 8601 — first scan ever for this user
  lastScanAt: string | null;
  lastScanCompletedAt: string | null;
  signalsMonitored: number; // total distinct gaps being watched
  signalsActive: number;
  signalsNew: number; // count of signals in "new" state (badge for "3 new")
  nextScheduledScanAt: string | null;
  perimeterIntegrity: number; // 0-100, derived score
}

/**
 * Response from /api/watch/log. Paginated feed of watch log entries.
 */
export interface WatchLogResponse {
  entries: WatchLogEntry[];
  hasMore: boolean;
  nextCursor: string | null;
}

/**
 * Threshold configuration for a single monitored metric. Drives the threshold
 * bar component in the Intensity 3 dashboard.
 */
export interface SignalThreshold {
  gapId: string;
  domain: SignalDomain;
  metricLabel: string; // "Cash yield", "Subscription load", etc.
  currentValue: number;
  currentValueFormatted: string; // "0.5%", "$247/mo"
  thresholdValue: number;
  thresholdLabel: string; // "threshold 3.5%"
  benchmarkValue: number | null; // e.g., market rate
  benchmarkLabel: string | null; // "market 4.8%"
  axisMin: number;
  axisMax: number;
  inBreach: boolean;
}

/**
 * Response from /api/watch/thresholds. Array of all monitored thresholds for
 * a user, used to render the threshold bars on the dashboard.
 */
export interface WatchThresholdsResponse {
  thresholds: SignalThreshold[];
}

/**
 * Response from /api/watch/perimeter. Drives PerimeterSVG. Signal positions
 * on the perimeter are derived deterministically from gapId by the component
 * via getSignalAngle, so no geometry is shipped on the wire.
 */
export interface PerimeterResponse {
  cashAmount: number;
  signals: Signal[];
}

/**
 * Snapshot of a signal at a single scan, as serialized for the per-signal
 * detail page. One row per (gapId, scanId).
 */
export interface SignalSnapshotWire {
  id: string;
  scanId: string;
  capturedAt: string;
  severity: SignalSeverity;
  state: SignalState;
  annualValue: number;
  lifetimeValue: number | null;
  payload: Record<string, unknown> | null;
}

/**
 * Notification row, as serialized for the per-signal detail page. Mirrors the
 * NotificationItem shape from lib/queries but scoped to a single signalId.
 */
export interface SignalNotificationWire {
  id: string;
  kind: 'new' | 'reopened' | 'worsened';
  title: string;
  body: string | null;
  dollarImpact: number | null;
  readAt: string | null;
  createdAt: string;
}

/**
 * Response from /api/signals/[id]. Drives the per-signal detail page.
 */
export interface SignalDetailResponse {
  signal: Signal;
  snapshots: SignalSnapshotWire[];
  notifications: SignalNotificationWire[];
}
