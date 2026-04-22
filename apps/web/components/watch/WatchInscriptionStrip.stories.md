# WatchInscriptionStrip

The persistent "ON WATCH" bar that sits at the top of every authenticated page.
Reinforces that Illumin is actively watching the user's financial situation.

Examples below use the mock data hook (`useMockWatchStatus`). Replace with the
real `useWatchStatus` once the watch status API is wired in.

## Active (default)

Normal case. Two-hour-old scan, three new signals.

```tsx
import WatchInscriptionStrip from "@/components/watch/WatchInscriptionStrip";
import { useMockWatchStatus } from "@/lib/vigilance/mockWatchStatus";

<WatchInscriptionStrip status={useMockWatchStatus("active").data} />
```

Renders:
`· ON WATCH · 17 signals monitored · last scan 2h ago         3 new`

## Loading

No data yet. Dot pulses faintly in muted tone.

```tsx
<WatchInscriptionStrip status={useMockWatchStatus("loading").data} />
```

Renders:
`· Posting the watch...`

## Stale scan

Last scan is older than 6 hours. Dot shifts to gold, text appends "scan overdue".

```tsx
<WatchInscriptionStrip status={useMockWatchStatus("stale").data} />
```

Renders:
`· ON WATCH · 14 signals monitored · last scan 8h ago · scan overdue   1 new`

## Scan failed

No successful scan in the last 24 hours. Dot turns to the negative token.

```tsx
<WatchInscriptionStrip status={useMockWatchStatus("failed").data} />
```

Renders:
`· ON WATCH · paused · retry soon`

## Fresh user (zero signals monitored)

Pre-first-scan. Empty state copy.

```tsx
<WatchInscriptionStrip status={useMockWatchStatus("fresh_user").data} />
```

Renders:
`· Setting up the watchtower...`

## All quiet (many signals, none new)

Active, recent scan, but the inbox is empty.

```tsx
<WatchInscriptionStrip status={useMockWatchStatus("all_quiet").data} />
```

Renders:
`· ON WATCH · 22 signals monitored · last scan 2h ago          all quiet`

## Scenario shorthand

For the authenticated layout the component accepts a `scenario` prop so the
mock hook is invoked internally. This is the integration shape the layout
currently uses; replace with real data later.

```tsx
<WatchInscriptionStrip scenario="active" />
```
