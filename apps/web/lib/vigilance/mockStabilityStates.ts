/**
 * Mock provider for per-gap stability state. Mirrors the shape of a future
 * /api/watch/stability endpoint so components can wire now and swap later.
 *
 * Scenarios are tuned to exercise every visible StabilityBadge variant
 * without needing a real backend.
 */

import type { SignalStateRecord, StabilityState } from "@/lib/types/vigilance";

export type MockStabilityScenario =
  | "mixed"
  | "all_stable"
  | "all_flagged"
  | "fresh_user";

export interface MockStabilityStatesResult {
  byGapId: Record<string, SignalStateRecord>;
  isLoading: boolean;
}

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

function isoAgo(ms: number): string {
  return new Date(Date.now() - ms).toISOString();
}

function stabilityDaysFrom(stateSinceIso: string): number {
  const delta = Date.now() - new Date(stateSinceIso).getTime();
  if (delta < 0) return 0;
  return Math.floor(delta / DAY);
}

function buildRecord(args: {
  gapId: string;
  currentState: StabilityState;
  stateSinceAgoMs: number;
  previousState?: StabilityState | null;
  lastCheckedAgoMs?: number;
  lastValue?: number | null;
  previousValue?: number | null;
}): SignalStateRecord {
  const stateSince = isoAgo(args.stateSinceAgoMs);
  const lastCheckedAt = isoAgo(args.lastCheckedAgoMs ?? 5 * MINUTE);
  return {
    gapId: args.gapId,
    currentState: args.currentState,
    stateSince,
    previousState: args.previousState ?? null,
    lastCheckedAt,
    lastValue: args.lastValue ?? null,
    previousValue: args.previousValue ?? null,
    stabilityDays: stabilityDaysFrom(stateSince),
  };
}

function byIndex(records: SignalStateRecord[]): Record<string, SignalStateRecord> {
  return Object.fromEntries(records.map(r => [r.gapId, r]))
}

/**
 * Mock gap ids used by the dashboard badge integration. Kept in one place so
 * the component integration and the mock data stay in sync.
 */
export const MOCK_STABILITY_GAP_IDS = {
  netWorth: "net_worth_stability",
  idleCash: "idle_cash",
  costOfWaiting: "cost_of_waiting",
} as const;

export function useMockStabilityStates(
  scenario: MockStabilityScenario = "mixed",
): MockStabilityStatesResult {
  switch (scenario) {
    case "fresh_user":
      return { byGapId: {}, isLoading: false };

    case "all_stable":
      return {
        isLoading: false,
        byGapId: byIndex([
          buildRecord({
            gapId: MOCK_STABILITY_GAP_IDS.netWorth,
            currentState: "stable",
            stateSinceAgoMs: 39 * DAY,
            lastValue: 0,
          }),
          buildRecord({
            gapId: MOCK_STABILITY_GAP_IDS.idleCash,
            currentState: "stable",
            stateSinceAgoMs: 14 * DAY,
            lastValue: 0,
          }),
          buildRecord({
            gapId: MOCK_STABILITY_GAP_IDS.costOfWaiting,
            currentState: "stable",
            stateSinceAgoMs: 2 * DAY,
            lastValue: 0,
          }),
        ]),
      };

    case "all_flagged":
      return {
        isLoading: false,
        byGapId: byIndex([
          buildRecord({
            gapId: MOCK_STABILITY_GAP_IDS.netWorth,
            currentState: "flagged",
            stateSinceAgoMs: 3 * DAY,
            lastCheckedAgoMs: 30 * MINUTE,
            lastValue: 1500,
            previousState: "stable",
          }),
          buildRecord({
            gapId: MOCK_STABILITY_GAP_IDS.idleCash,
            currentState: "widening",
            stateSinceAgoMs: 6 * DAY,
            lastCheckedAgoMs: 2 * HOUR,
            lastValue: 2200,
            previousValue: 1800,
            previousState: "flagged",
          }),
          buildRecord({
            gapId: MOCK_STABILITY_GAP_IDS.costOfWaiting,
            currentState: "widening",
            stateSinceAgoMs: 6 * DAY,
            lastCheckedAgoMs: 2 * HOUR,
            lastValue: 31000,
            previousValue: 26000,
            previousState: "flagged",
          }),
        ]),
      };

    case "mixed":
    default:
      return {
        isLoading: false,
        byGapId: byIndex([
          buildRecord({
            gapId: MOCK_STABILITY_GAP_IDS.netWorth,
            currentState: "stable",
            stateSinceAgoMs: 39 * DAY,
            lastValue: 0,
          }),
          buildRecord({
            gapId: MOCK_STABILITY_GAP_IDS.idleCash,
            currentState: "flagged",
            stateSinceAgoMs: 6 * DAY,
            lastCheckedAgoMs: 2 * HOUR,
            lastValue: 2200,
            previousState: "stable",
          }),
          buildRecord({
            gapId: MOCK_STABILITY_GAP_IDS.costOfWaiting,
            currentState: "widening",
            stateSinceAgoMs: 6 * DAY,
            lastCheckedAgoMs: 2 * HOUR,
            lastValue: 31000,
            previousValue: 26000,
            previousState: "flagged",
          }),
        ]),
      };
  }
}
