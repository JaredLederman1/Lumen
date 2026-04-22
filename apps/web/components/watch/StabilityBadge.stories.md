# StabilityBadge

Compact inline badge that sells the vigilance thesis on every metric card:
"STABLE 39d" under Net Worth tells the user Illumin has been watching this
figure for 39 days without incident. Placed directly below the numeric value
so the eye catches it in the same glance.

## Props

```ts
interface StabilityBadgeProps {
  state?: SignalStateRecord | null
  ariaContextLabel?: string   // optional prefix for the aria-label
}
```

If `state` is null or undefined the component renders nothing (not even a
spacer). Callers can pass a value straight through without conditional
wrappers.

## Anatomy

- `font-family: var(--font-mono)` (DM Mono)
- `font-size: 10px`
- `letter-spacing: 0.04em`
- No fill, no border, no padding
- Color driven entirely by CSS custom properties

## State to visual

| currentState      | Output               | Color token             |
|-------------------|----------------------|-------------------------|
| `stable`          | `STABLE 39d`         | `--color-positive`      |
| `flagged`         | `FLAGGED · 2h ago`   | `--color-negative`      |
| `widening`        | `WIDENING 6d`        | `--color-negative`      |
| `narrowing`       | `NARROWING 3d`       | `--color-positive`      |
| `resolved_recent` | `RESOLVED 5d`        | `--color-text-muted`    |

Separator is a middle dot (`·`), never an em dash.

## Duration edge cases

- `stabilityDays < 1` → `STABLE today`
- `stabilityDays >= 365` → `STABLE 1y+` (floored to whole years)
- `stateSince` in the future (clock skew) → treated as today
- For `flagged`, `lastCheckedAt < 2 min` → `FLAGGED · just now`

## Usage

### Dashboard — Net Worth card

```tsx
import StabilityBadge from '@/components/watch/StabilityBadge'
import {
  useMockStabilityStates,
  MOCK_STABILITY_GAP_IDS,
} from '@/lib/vigilance/mockStabilityStates'

const stability = useMockStabilityStates('mixed')

<NetWorthCard {...props} />
<StabilityBadge
  state={stability.byGapId[MOCK_STABILITY_GAP_IDS.netWorth]}
  ariaContextLabel="Net worth stability"
/>
```

Renders: `STABLE 39d` in positive green.

### Idle Cash — flagged

```tsx
<StabilityBadge
  state={stability.byGapId[MOCK_STABILITY_GAP_IDS.idleCash]}
  ariaContextLabel="Idle cash stability"
/>
```

Renders: `FLAGGED · 2h ago` in negative red.

### Cost of Waiting — widening

```tsx
<StabilityBadge
  state={stability.byGapId[MOCK_STABILITY_GAP_IDS.costOfWaiting]}
  ariaContextLabel="Cost of waiting stability"
/>
```

Renders: `WIDENING 6d` in negative red.

### Narrowing (debt paying down)

```tsx
<StabilityBadge
  state={{
    gapId: 'debt:high_apr',
    currentState: 'narrowing',
    stateSince: '2026-04-19T00:00:00Z',
    previousState: 'flagged',
    lastCheckedAt: new Date().toISOString(),
    lastValue: 1800,
    previousValue: 2400,
    stabilityDays: 3,
  }}
/>
```

Renders: `NARROWING 3d` in positive green.

### Resolved recent

```tsx
<StabilityBadge
  state={{
    gapId: 'hysa:default',
    currentState: 'resolved_recent',
    stateSince: '2026-04-17T00:00:00Z',
    previousState: 'flagged',
    lastCheckedAt: new Date().toISOString(),
    lastValue: 0,
    previousValue: 1200,
    stabilityDays: 5,
  }}
/>
```

Renders: `RESOLVED 5d` in muted text.

### Nothing to show

```tsx
<StabilityBadge state={null} />
// renders nothing
```

## Mock scenarios

`useMockStabilityStates(scenario)` where scenario is one of:

- `mixed` (default) — net worth stable 39d, idle cash flagged 2h ago,
  cost of waiting widening 6d. This is the golden demo state.
- `all_stable` — every metric stable for varying durations.
- `all_flagged` — stress test: everything flagged or widening.
- `fresh_user` — empty `byGapId`; badges render nothing.

## Accessibility

The badge is `role="status"` with a computed `aria-label` that includes the
optional `ariaContextLabel`. Example: `"Net worth stability: stable 39d"`.
Screen readers get the full sentence; sighted users see the compact form.
