# SentinelHero

The top hero section of the Sentinel page at `/dashboard/sentinel`. Pairs the
page title and subtitle with a metadata bar summarizing when the watch began,
when the next scan fires, and the current perimeter integrity score.

Examples below use the mock data hook (`useMockWatchStatus`). Replace with the
real `useWatchStatus` once the watch status API is wired in.

## Active (default)

Standard case. 47 days on watch, upcoming scan in roughly two hours, integrity
score of 86 drawn in primary text.

```tsx
import SentinelHero from "@/components/watch/SentinelHero";
import { useMockWatchStatus } from "@/lib/vigilance/mockWatchStatus";

const status = useMockWatchStatus("active").data!;
<SentinelHero watchStatus={status} />
```

Renders roughly:

```
The Sentinel
What Illumin is watching on your behalf

ON WATCH SINCE MAR 06, 2026    NEXT SCAN SOON    86
                                                 /100 PERIMETER INTEGRITY
```

## Fresh user (degraded copy)

Pre-first-scan. The degraded branches kick in: the left slot reads
"SETTING UP WATCH", the center slot reads "NEXT SCAN SOON", and the integrity
score renders as `—` rather than the literal `100`, since a perimeter with
zero monitored signals is not yet scored.

```tsx
const status = useMockWatchStatus("fresh_user").data!;
<SentinelHero watchStatus={status} />
```

Renders roughly:

```
The Sentinel
What Illumin is watching on your behalf

SETTING UP WATCH    NEXT SCAN SOON    —
                                      /100 PERIMETER INTEGRITY
```

## Perimeter breach (low integrity)

Active user with multiple flagged signals. The integrity number uses the
gold token when the score drops below 85 and the negative token below 70, so
the hero reads as "amber" or "red" at a glance depending on how bad the
perimeter is.

```tsx
const status = useMockWatchStatus("stale").data!;
// integrity 78 → gold
<SentinelHero watchStatus={status} />

// integrity 60 (manual value) → negative
<SentinelHero
  watchStatus={{ ...status, perimeterIntegrity: 60, signalsActive: 7 }}
/>
```

## Props

```ts
interface SentinelHeroProps {
  watchStatus: WatchStatus;
  className?: string;
}
```

The component is a pure presenter. It does not fetch its own status; the
parent page owns the data hook so mock vs. real can be swapped in one place.
