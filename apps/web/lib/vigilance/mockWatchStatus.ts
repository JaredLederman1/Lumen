import type { WatchStatus } from "@/lib/types/vigilance";

export type MockScenario =
  | "active"
  | "loading"
  | "stale"
  | "failed"
  | "fresh_user"
  | "all_quiet";

export interface MockWatchStatusResult {
  data: WatchStatus | null;
  isLoading: boolean;
  isError: boolean;
}

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

function isoAgo(ms: number): string {
  return new Date(Date.now() - ms).toISOString();
}

export function formatRelativeScan(iso: string): string {
  const delta = Date.now() - new Date(iso).getTime();
  if (delta < 2 * 60 * 1000) return "just now";
  const minutes = Math.floor(delta / (60 * 1000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function useMockWatchStatus(
  scenario: MockScenario = "active"
): MockWatchStatusResult {
  switch (scenario) {
    case "loading":
      return { data: null, isLoading: true, isError: false };

    case "fresh_user":
      return {
        data: {
          onWatchSince: isoAgo(5 * 60 * 1000),
          lastScanAt: null,
          lastScanCompletedAt: null,
          signalsMonitored: 0,
          signalsActive: 0,
          signalsNew: 0,
          nextScheduledScanAt: null,
          perimeterIntegrity: 100,
        },
        isLoading: false,
        isError: false,
      };

    case "stale":
      return {
        data: {
          onWatchSince: isoAgo(42 * DAY),
          lastScanAt: isoAgo(8 * HOUR),
          lastScanCompletedAt: isoAgo(8 * HOUR),
          signalsMonitored: 14,
          signalsActive: 3,
          signalsNew: 1,
          nextScheduledScanAt: null,
          perimeterIntegrity: 78,
        },
        isLoading: false,
        isError: false,
      };

    case "failed":
      return {
        data: {
          onWatchSince: isoAgo(42 * DAY),
          lastScanAt: isoAgo(26 * HOUR),
          lastScanCompletedAt: null,
          signalsMonitored: 14,
          signalsActive: 3,
          signalsNew: 0,
          nextScheduledScanAt: null,
          perimeterIntegrity: 60,
        },
        isLoading: false,
        isError: false,
      };

    case "all_quiet":
      return {
        data: {
          onWatchSince: isoAgo(61 * DAY),
          lastScanAt: isoAgo(2 * HOUR),
          lastScanCompletedAt: isoAgo(2 * HOUR),
          signalsMonitored: 22,
          signalsActive: 0,
          signalsNew: 0,
          nextScheduledScanAt: null,
          perimeterIntegrity: 98,
        },
        isLoading: false,
        isError: false,
      };

    case "active":
    default:
      return {
        data: {
          onWatchSince: isoAgo(47 * DAY),
          lastScanAt: isoAgo(2 * HOUR),
          lastScanCompletedAt: isoAgo(2 * HOUR),
          signalsMonitored: 17,
          signalsActive: 4,
          signalsNew: 3,
          nextScheduledScanAt: null,
          perimeterIntegrity: 86,
        },
        isLoading: false,
        isError: false,
      };
  }
}
