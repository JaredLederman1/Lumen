# PerimeterSVG

The hero visual of the Intensity 3 watchtower. Concentric rings map to
liquidity bands (cash at center, short-term / long-term investments, then
the aspirational horizon). Signal dots orbit on the ring that corresponds
to their domain, sized and colored by severity.

## Props

```ts
interface PerimeterSVGProps {
  cashAmount: number;
  signals: Signal[];
  size?: number;                                       // default 400
  onSignalClick?: (signal: Signal) => void;
  onRingClick?: (ring:
    | "cash"
    | "short_term"
    | "long_term"
    | "aspirational"
  ) => void;
  className?: string;
}
```

Size defaults to 400. When no `size` is provided the component drops to
280 at viewports under 480px. Explicit `size` always wins.

## Ring mapping

| Ring           | Domains                             | Stroke                    |
|----------------|-------------------------------------|---------------------------|
| cash (center)  | aggregated liquid cash              | 1px, subtle fill          |
| short_term     | `idle_cash`, `hysa`                 | 0.75px solid              |
| long_term      | `debt`, `match`, `tax_advantaged`   | 0.75px solid              |
| aspirational   | `benefits`                          | 0.75px dashed (2 3)       |

## Severity

| Severity  | Dot radius | Halo     | Color                     |
|-----------|-----------:|---------:|---------------------------|
| advisory  | 4px        | none     | `--color-text-muted`      |
| flagged   | 5px        | 8px      | `--color-gold`            |
| urgent    | 5px        | 10px     | `--color-negative`        |

Only `urgent` halos pulse. The cycle is 3s, opacity 0.18 to 0.42, and
nothing else on the component animates.

## Interactions

- Hovering a ring fades its label in at the top, dims the other rings,
  and outlines the dots on that ring.
- Hovering a signal dot scales it to 1.15x and reveals a tooltip with
  headline, annual value, and severity tag. Tooltip placement flips
  based on which quadrant the dot sits in, so it never clips.
- Clicking a signal calls `onSignalClick(signal)`. Clicking a ring calls
  `onRingClick(ring)`. Both are optional.
- Dots are keyboard-focusable with `role="button"`. Enter or Space fires
  `onSignalClick`.

## Scenarios

`useMockPerimeterData(scenario)` from `lib/vigilance/mockPerimeterData.ts`:

- `realistic` (default) — 6 signals across every ring, cash $18,400.
  Mix of advisory, flagged, and one urgent match gap.
- `sparse` — 2 advisory signals, cash $5,200.
- `saturated` — 13 signals across all rings, cash $42,300. Stress
  test for collision handling.
- `clean` — 0 signals, cash $24,800. All-quiet empty state.
- `urgent` — 3 urgent signals only, cash $11,600. For the "perimeter
  is breached" end of the spectrum.

## Usage

### Default

```tsx
import PerimeterSVG from "@/components/watch/PerimeterSVG";
import { useMockPerimeterData } from "@/lib/vigilance/mockPerimeterData";

export function Demo() {
  const { cashAmount, signals } = useMockPerimeterData("realistic");
  return <PerimeterSVG cashAmount={cashAmount} signals={signals} />;
}
```

### With interaction handlers

```tsx
const { cashAmount, signals } = useMockPerimeterData("realistic");

<PerimeterSVG
  cashAmount={cashAmount}
  signals={signals}
  onSignalClick={signal => {
    // Later prompt: open the signal detail modal here.
    console.log("Clicked signal", signal.gapId);
  }}
  onRingClick={ring => {
    // Optional: deep-link to the ring view on the watchtower page.
    console.log("Clicked ring", ring);
  }}
/>
```

### Stress test

```tsx
const { cashAmount, signals } = useMockPerimeterData("saturated");
<PerimeterSVG cashAmount={cashAmount} signals={signals} size={480} />
```

### Empty state

```tsx
const { cashAmount, signals } = useMockPerimeterData("clean");
<PerimeterSVG cashAmount={cashAmount} signals={signals} />
```

Renders the rings and the cash label with no dots. The aria-label reads
"All quiet" so screen-reader users hear the empty state explicitly.

## Accessibility

- Root SVG has `role="img"` and an `aria-label` summarizing severity
  counts and cash position.
- A visually-hidden `<desc>` lists the per-ring signal count.
- Each dot is a focusable button with an aria-label like
  "Idle cash drag. $840 per year. flagged."
- Ring hover labels use `aria-live="polite"` so their appearance is
  announced when the pointer lands on a ring.

## Later wiring

The `onSignalClick` callback is the seam where a later prompt will mount
the signal detail modal. Keep this prop optional so the component can
ship first against mock data without a host to receive the click.
