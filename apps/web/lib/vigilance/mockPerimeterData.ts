/**
 * Mock provider for the perimeter SVG. Returns deterministic cash + signals
 * per scenario so the component can be exercised in every realistic state
 * before the real /api/watch wiring lands.
 */

"use client";

import { useMemo } from "react";
import type {
  Signal,
  SignalDomain,
  SignalSeverity,
  SignalState,
} from "@/lib/types/vigilance";

export type PerimeterScenario =
  | "realistic"
  | "sparse"
  | "saturated"
  | "clean"
  | "urgent";

export interface MockPerimeterData {
  cashAmount: number;
  signals: Signal[];
}

interface SignalSeed {
  gapId: string;
  domain: SignalDomain;
  severity: SignalSeverity;
  annualValue: number;
  lifetimeValue?: number;
  state?: SignalState;
  payload?: Record<string, unknown>;
  firstDetectedDaysAgo?: number;
}

const DAY = 24 * 60 * 60 * 1000;

function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * DAY).toISOString();
}

function buildSignal(seed: SignalSeed): Signal {
  const firstDetectedDaysAgo = seed.firstDetectedDaysAgo ?? 7;
  return {
    id: `mock_perimeter_${seed.gapId}`,
    gapId: seed.gapId,
    domain: seed.domain,
    state: seed.state ?? "active",
    severity: seed.severity,
    annualValue: seed.annualValue,
    lifetimeValue: seed.lifetimeValue ?? null,
    payload: seed.payload ?? null,
    firstDetectedAt: isoDaysAgo(firstDetectedDaysAgo),
    lastSeenAt: isoDaysAgo(0),
    acknowledgedAt: null,
    actedAt: null,
    resolvedAt: null,
  };
}

const REALISTIC_SEEDS: SignalSeed[] = [
  {
    gapId: "idle_cash:default",
    domain: "idle_cash",
    severity: "flagged",
    annualValue: 840,
    payload: { label: "Idle cash drag" },
    firstDetectedDaysAgo: 4,
  },
  {
    gapId: "hysa:default",
    domain: "hysa",
    severity: "flagged",
    annualValue: 540,
    payload: { gapBps: 430, label: "HYSA yield gap" },
    firstDetectedDaysAgo: 9,
  },
  {
    gapId: "match:401k",
    domain: "match",
    severity: "urgent",
    annualValue: 3600,
    payload: { label: "401(k) employer match" },
    firstDetectedDaysAgo: 14,
  },
  {
    gapId: "tax_advantaged:ira:2026",
    domain: "tax_advantaged",
    severity: "flagged",
    annualValue: 6500,
    payload: { kind: "IRA", label: "IRA contribution room" },
    firstDetectedDaysAgo: 30,
  },
  {
    gapId: "debt:high_apr",
    domain: "debt",
    severity: "advisory",
    annualValue: 420,
    payload: { label: "High-APR debt" },
    firstDetectedDaysAgo: 2,
  },
  {
    gapId: "benefits:HSA",
    domain: "benefits",
    severity: "advisory",
    annualValue: 1200,
    payload: { label: "HSA contributions" },
    firstDetectedDaysAgo: 21,
  },
];

const SPARSE_SEEDS: SignalSeed[] = [
  {
    gapId: "idle_cash:default",
    domain: "idle_cash",
    severity: "advisory",
    annualValue: 140,
    payload: { label: "Idle cash drag" },
    firstDetectedDaysAgo: 3,
  },
  {
    gapId: "benefits:Commuter",
    domain: "benefits",
    severity: "advisory",
    annualValue: 315,
    payload: { label: "Commuter benefits" },
    firstDetectedDaysAgo: 11,
  },
];

const URGENT_SEEDS: SignalSeed[] = [
  {
    gapId: "match:401k",
    domain: "match",
    severity: "urgent",
    annualValue: 4200,
    payload: { label: "401(k) employer match" },
    firstDetectedDaysAgo: 6,
  },
  {
    gapId: "debt:high_apr",
    domain: "debt",
    severity: "urgent",
    annualValue: 2140,
    payload: { label: "High-APR debt" },
    firstDetectedDaysAgo: 2,
  },
  {
    gapId: "tax_advantaged:ira:2026",
    domain: "tax_advantaged",
    severity: "urgent",
    annualValue: 6500,
    payload: { kind: "IRA", label: "IRA contribution room" },
    firstDetectedDaysAgo: 40,
  },
];

const SATURATED_SEEDS: SignalSeed[] = [
  ...REALISTIC_SEEDS,
  {
    gapId: "hysa:secondary",
    domain: "hysa",
    severity: "advisory",
    annualValue: 180,
    payload: { gapBps: 120, label: "Secondary HYSA yield gap" },
    firstDetectedDaysAgo: 5,
  },
  {
    gapId: "idle_cash:savings",
    domain: "idle_cash",
    severity: "advisory",
    annualValue: 210,
    payload: { label: "Idle savings bucket" },
    firstDetectedDaysAgo: 6,
  },
  {
    gapId: "debt:student_loan",
    domain: "debt",
    severity: "flagged",
    annualValue: 900,
    payload: { label: "Student loan refinancing" },
    firstDetectedDaysAgo: 45,
  },
  {
    gapId: "match:espp",
    domain: "match",
    severity: "flagged",
    annualValue: 1800,
    payload: { label: "ESPP discount unused" },
    firstDetectedDaysAgo: 22,
  },
  {
    gapId: "tax_advantaged:hsa:2026",
    domain: "tax_advantaged",
    severity: "advisory",
    annualValue: 2400,
    payload: { kind: "HSA", label: "HSA contribution room" },
    firstDetectedDaysAgo: 18,
  },
  {
    gapId: "benefits:FSA",
    domain: "benefits",
    severity: "flagged",
    annualValue: 960,
    payload: { label: "FSA unused balance" },
    firstDetectedDaysAgo: 33,
  },
  {
    gapId: "benefits:tuition",
    domain: "benefits",
    severity: "advisory",
    annualValue: 1500,
    payload: { label: "Tuition reimbursement" },
    firstDetectedDaysAgo: 50,
  },
];

function seedsFor(scenario: PerimeterScenario): SignalSeed[] {
  switch (scenario) {
    case "sparse":
      return SPARSE_SEEDS;
    case "saturated":
      return SATURATED_SEEDS;
    case "clean":
      return [];
    case "urgent":
      return URGENT_SEEDS;
    case "realistic":
    default:
      return REALISTIC_SEEDS;
  }
}

function cashFor(scenario: PerimeterScenario): number {
  switch (scenario) {
    case "sparse":
      return 5200;
    case "saturated":
      return 42300;
    case "clean":
      return 24800;
    case "urgent":
      return 11600;
    case "realistic":
    default:
      return 18400;
  }
}

export function useMockPerimeterData(
  scenario: PerimeterScenario = "realistic",
): MockPerimeterData {
  return useMemo(
    () => ({
      cashAmount: cashFor(scenario),
      signals: seedsFor(scenario).map(buildSignal),
    }),
    [scenario],
  );
}
