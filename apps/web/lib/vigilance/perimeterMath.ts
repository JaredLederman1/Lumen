/**
 * Pure math for the perimeter SVG.
 *
 * Signals are distributed around the perimeter deterministically: the same
 * gapId always lands at the same angle, with a small seeded jitter applied
 * per-domain so signals on the same ring don't overlap when many are present.
 * Exporting these helpers so the component stays presentational and a later
 * unit-test pass can pin down the layout.
 */

import type { SignalDomain } from "@/lib/types/vigilance";

export type PerimeterRing = "cash" | "short_term" | "long_term" | "aspirational";

export interface RingBoundaries {
  cashRadius: number;
  ring1: number;
  ring2: number;
  ring3: number;
}

const DOMAIN_TO_RING: Record<SignalDomain, Exclude<PerimeterRing, "cash">> = {
  idle_cash: "short_term",
  hysa: "short_term",
  debt: "long_term",
  match: "long_term",
  tax_advantaged: "long_term",
  benefits: "aspirational",
};

export function getRingForDomain(domain: SignalDomain): Exclude<PerimeterRing, "cash"> {
  return DOMAIN_TO_RING[domain];
}

/**
 * Ring boundaries as radii, centered on the SVG midpoint. The cash circle is
 * a filled disc; ring1/2/3 are stroked circles. Values tuned so signal dots
 * sit cleanly on the rings without crowding the center label.
 */
export function getRingBoundaries(size: number): RingBoundaries {
  const half = size / 2;
  return {
    cashRadius: half * 0.22,
    ring1: half * 0.42,
    ring2: half * 0.62,
    ring3: half * 0.84,
  };
}

export function getRingRadius(ring: PerimeterRing, size: number): number {
  const b = getRingBoundaries(size);
  switch (ring) {
    case "cash":
      return b.cashRadius;
    case "short_term":
      return b.ring1;
    case "long_term":
      return b.ring2;
    case "aspirational":
      return b.ring3;
  }
}

/**
 * FNV-1a 32-bit hash. Small, stable, no dependencies. Used to seed the angle
 * for a given gapId so the same signal renders in the same spot every load.
 */
function hashString(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * Deterministic 0..1 pseudo-random derived from the hash. A second call with
 * a `salt` returns a different value for jitter without taking on a PRNG.
 */
function seededUnit(seed: number, salt: number): number {
  const mixed = Math.imul(seed ^ salt, 0x85ebca6b) >>> 0;
  return (mixed % 10000) / 10000;
}

export interface SignalAngleOptions {
  /** Max jitter in radians. Defaults to ~6° so dots breathe but stay on the ring. */
  jitterRadians?: number;
}

/**
 * Returns an angle in radians (0 = 3 o'clock, CCW is positive per SVG convention
 * where y grows downward, so sin is inverted at render time). Output is in
 * [0, 2π) with a small deterministic jitter so sibling signals don't stack.
 */
export function getSignalAngle(gapId: string, opts: SignalAngleOptions = {}): number {
  const jitter = opts.jitterRadians ?? (Math.PI / 180) * 6;
  const h = hashString(gapId);
  const base = (h % 360) * (Math.PI / 180);
  const jitterSigned = (seededUnit(h, 0x9e3779b9) - 0.5) * 2 * jitter;
  const angle = base + jitterSigned;
  const twoPi = Math.PI * 2;
  return ((angle % twoPi) + twoPi) % twoPi;
}

/**
 * Radius at which a signal of `domain` should render, given SVG size.
 * Equivalent to calling getRingRadius with the ring mapped from the domain.
 */
export function getSignalRadius(domain: SignalDomain, size: number): number {
  return getRingRadius(getRingForDomain(domain), size);
}

export interface Point {
  x: number;
  y: number;
}

/**
 * Projects (angle, radius) to cartesian coordinates relative to the SVG
 * center. Uses the standard SVG convention (y grows downward), so the angle
 * is interpreted with `sin` mapped to -y to keep "0 rad = right, π/2 = up".
 */
export function polarToCartesian(
  centerX: number,
  centerY: number,
  radius: number,
  angleRadians: number,
): Point {
  return {
    x: centerX + radius * Math.cos(angleRadians),
    y: centerY - radius * Math.sin(angleRadians),
  };
}

/** Which half of the perimeter a point falls into. Drives tooltip placement. */
export function quadrantOf(point: Point, center: Point): {
  horizontal: "left" | "right";
  vertical: "top" | "bottom";
} {
  return {
    horizontal: point.x >= center.x ? "right" : "left",
    vertical: point.y <= center.y ? "top" : "bottom",
  };
}
