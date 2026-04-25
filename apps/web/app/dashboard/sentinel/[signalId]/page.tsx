"use client";

import { use, type CSSProperties, type ReactElement } from "react";
import Link from "next/link";
import { useSignalDetailQuery } from "@/lib/queries";
import {
  getRecommendedAction,
} from "@/lib/vigilance/signalActions";
import type {
  Signal,
  SignalDomain,
  SignalNotificationWire,
  SignalSeverity,
  SignalSnapshotWire,
} from "@/lib/types/vigilance";

const DOMAIN_LABEL: Record<SignalDomain, string> = {
  idle_cash: "Idle cash drag",
  hysa: "HYSA yield gap",
  debt: "High-APR debt",
  match: "Employer match gap",
  tax_advantaged: "Tax-advantaged capacity",
  benefits: "Benefits capacity",
  subscription: "Subscription load",
  category_overspend: "Spending pressure",
  recurring_change: "Recurring drift",
};

const SEVERITY_LABEL: Record<SignalSeverity, string> = {
  advisory: "ADVISORY",
  flagged: "FLAGGED",
  urgent: "URGENT",
};

const KIND_LABEL: Record<SignalNotificationWire["kind"], string> = {
  new: "New",
  reopened: "Reopened",
  worsened: "Worsened",
};

function severityColor(severity: SignalSeverity): string {
  switch (severity) {
    case "urgent":
      return "var(--color-negative)";
    case "flagged":
      return "var(--color-gold)";
    case "advisory":
      return "var(--color-text-muted)";
  }
}

function severityBg(severity: SignalSeverity): string {
  switch (severity) {
    case "urgent":
      return "var(--color-negative-bg)";
    case "flagged":
      return "var(--color-gold-subtle)";
    case "advisory":
      return "var(--color-surface-2)";
  }
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(iso: string): string {
  return new Date(iso)
    .toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
    .toUpperCase();
}

function signalHeadline(signal: Signal): string {
  const label = (signal.payload as { label?: string } | null)?.label;
  if (label && typeof label === "string") return label;
  return DOMAIN_LABEL[signal.domain];
}

interface TimelineEvent {
  timestamp: string;
  label: string;
  detail: string | null;
  dollarMagnitude: number | null;
}

function buildTimeline(
  signal: Signal,
  snapshots: SignalSnapshotWire[],
): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  events.push({
    timestamp: signal.firstDetectedAt,
    label: "Detected",
    detail: "First flagged by a perimeter scan.",
    dollarMagnitude: snapshots[0]?.annualValue ?? signal.annualValue,
  });

  let lastValue = snapshots[0]?.annualValue ?? signal.annualValue;
  let lastState = snapshots[0]?.state ?? signal.state;
  for (let i = 1; i < snapshots.length; i++) {
    const s = snapshots[i];
    if (s.state !== lastState) {
      events.push({
        timestamp: s.capturedAt,
        label: `State changed to ${s.state}`,
        detail: null,
        dollarMagnitude: s.annualValue,
      });
      lastState = s.state;
      lastValue = s.annualValue;
      continue;
    }
    if (Math.abs(s.annualValue - lastValue) > Math.max(100, lastValue * 0.1)) {
      const widened = s.annualValue > lastValue;
      events.push({
        timestamp: s.capturedAt,
        label: widened ? "Widened" : "Narrowed",
        detail: `${formatCurrency(Math.abs(s.annualValue - lastValue))} ${widened ? "increase" : "decrease"} in annual impact.`,
        dollarMagnitude: s.annualValue,
      });
      lastValue = s.annualValue;
    }
  }

  if (signal.acknowledgedAt) {
    events.push({
      timestamp: signal.acknowledgedAt,
      label: "Acknowledged",
      detail: null,
      dollarMagnitude: null,
    });
  }
  if (signal.actedAt) {
    events.push({
      timestamp: signal.actedAt,
      label: "Acted on",
      detail: null,
      dollarMagnitude: null,
    });
  }
  if (signal.resolvedAt) {
    events.push({
      timestamp: signal.resolvedAt,
      label: "Resolved",
      detail: "Signal closed out.",
      dollarMagnitude: null,
    });
  }

  return events.sort((a, b) =>
    a.timestamp < b.timestamp ? -1 : a.timestamp > b.timestamp ? 1 : 0,
  );
}

function NotFoundView({ signalId }: { signalId: string }): ReactElement {
  const wrapperStyle: CSSProperties = {
    maxWidth: 640,
    margin: "0 auto",
    padding: "96px 24px",
    display: "flex",
    flexDirection: "column",
    gap: 16,
    alignItems: "flex-start",
  };
  return (
    <main aria-label="Signal not found" style={wrapperStyle}>
      <p
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--color-text-muted)",
          margin: 0,
        }}
      >
        SIGNAL · {signalId}
      </p>
      <h1
        style={{
          fontFamily: "var(--font-serif)",
          fontSize: 32,
          fontWeight: 400,
          color: "var(--color-text)",
          margin: 0,
          lineHeight: 1.1,
        }}
      >
        Signal not found
      </h1>
      <p
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: 14,
          color: "var(--color-text-mid)",
          lineHeight: 1.6,
          margin: 0,
        }}
      >
        This signal does not exist or is not associated with your account.
      </p>
      <Link
        href="/dashboard/sentinel"
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          letterSpacing: "0.08em",
          color: "var(--color-gold)",
          textDecoration: "none",
          marginTop: 8,
        }}
      >
        Back to perimeter &rarr;
      </Link>
    </main>
  );
}

function LoadingView(): ReactElement {
  const wrapperStyle: CSSProperties = {
    maxWidth: 960,
    margin: "0 auto",
    padding: "32px 24px 64px",
    display: "flex",
    flexDirection: "column",
    gap: 24,
  };
  const block: CSSProperties = {
    backgroundColor: "var(--color-surface-2)",
    opacity: 0.55,
    borderRadius: 2,
  };
  return (
    <main aria-label="Loading signal" style={wrapperStyle}>
      <div style={{ ...block, height: 14, width: 120 }} />
      <div style={{ ...block, height: 36, width: 320 }} />
      <div style={{ ...block, height: 80, width: "100%" }} />
      <div style={{ ...block, height: 200, width: "100%" }} />
    </main>
  );
}

export default function SignalDetailPage({
  params,
}: {
  params: Promise<{ signalId: string }>;
}): ReactElement {
  const { signalId } = use(params);
  const { data, isLoading, isError } = useSignalDetailQuery(signalId);

  if (isLoading) return <LoadingView />;
  if (isError || !data) return <NotFoundView signalId={signalId} />;

  const { signal, snapshots, notifications } = data;
  const headline = signalHeadline(signal);
  const action = getRecommendedAction(signal.domain);
  const timeline = buildTimeline(signal, snapshots);

  const wrapperStyle: CSSProperties = {
    maxWidth: 960,
    margin: "0 auto",
    padding: "32px 24px 64px",
    display: "flex",
    flexDirection: "column",
    gap: 40,
  };

  const eyebrowStyle: CSSProperties = {
    fontFamily: "var(--font-mono)",
    fontSize: 11,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "var(--color-text-muted)",
    margin: 0,
  };

  const headerStyle: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: 16,
    paddingBottom: 24,
    borderBottom: "0.5px solid var(--color-border)",
  };

  const titleRowStyle: CSSProperties = {
    display: "flex",
    alignItems: "baseline",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 16,
  };

  const titleStyle: CSSProperties = {
    fontFamily: "var(--font-serif)",
    fontSize: 32,
    fontWeight: 400,
    color: "var(--color-text)",
    margin: 0,
    lineHeight: 1.15,
  };

  const dollarStyle: CSSProperties = {
    fontFamily: "var(--font-mono)",
    fontSize: 24,
    fontWeight: 500,
    color: "var(--color-text)",
    margin: 0,
  };

  const severityBadgeStyle: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    padding: "4px 10px",
    borderRadius: "var(--radius-pill)",
    backgroundColor: severityBg(signal.severity),
    color: severityColor(signal.severity),
    fontFamily: "var(--font-mono)",
    fontSize: 10,
    letterSpacing: "0.1em",
  };

  const sectionTitleStyle: CSSProperties = {
    fontFamily: "var(--font-mono)",
    fontSize: 11,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "var(--color-text-muted)",
    margin: 0,
    paddingBottom: 8,
    borderBottom: "0.5px solid var(--color-border)",
  };

  const actionCardStyle: CSSProperties = {
    padding: 24,
    backgroundColor: "var(--color-surface)",
    border: "0.5px solid var(--color-border)",
    borderRadius: "var(--radius-lg)",
    display: "flex",
    flexDirection: "column",
    gap: 12,
  };

  const timelineStyle: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: 16,
    listStyle: "none",
    margin: 0,
    padding: 0,
  };

  const timelineRowStyle: CSSProperties = {
    display: "grid",
    gridTemplateColumns: "120px 1fr auto",
    gap: 16,
    alignItems: "baseline",
    paddingBottom: 12,
    borderBottom: "0.5px solid var(--color-border)",
  };

  const timestampStyle: CSSProperties = {
    fontFamily: "var(--font-mono)",
    fontSize: 11,
    letterSpacing: "0.06em",
    color: "var(--color-text-muted)",
  };

  const eventLabelStyle: CSSProperties = {
    fontFamily: "var(--font-serif)",
    fontSize: 14,
    color: "var(--color-text)",
  };

  const eventDetailStyle: CSSProperties = {
    fontFamily: "var(--font-mono)",
    fontSize: 12,
    color: "var(--color-text-mid)",
    marginTop: 2,
  };

  const dollarColumnStyle: CSSProperties = {
    fontFamily: "var(--font-mono)",
    fontSize: 12,
    color: "var(--color-text-mid)",
    whiteSpace: "nowrap",
  };

  const notifRowStyle: CSSProperties = {
    display: "grid",
    gridTemplateColumns: "120px 80px 1fr auto",
    gap: 16,
    alignItems: "baseline",
    paddingBottom: 10,
    borderBottom: "0.5px solid var(--color-border)",
  };

  const ctaStyle: CSSProperties = {
    fontFamily: "var(--font-mono)",
    fontSize: 12,
    letterSpacing: "0.08em",
    color: "var(--color-gold)",
    textDecoration: "none",
    alignSelf: "flex-start",
    marginTop: 4,
  };

  const backLinkStyle: CSSProperties = {
    fontFamily: "var(--font-mono)",
    fontSize: 11,
    letterSpacing: "0.08em",
    color: "var(--color-text-muted)",
    textDecoration: "none",
    alignSelf: "flex-start",
  };

  return (
    <main aria-label={`Signal: ${headline}`} style={wrapperStyle}>
      <Link href="/dashboard/sentinel" style={backLinkStyle}>
        &larr; Perimeter
      </Link>

      <header style={headerStyle}>
        <p style={eyebrowStyle}>SIGNAL · {DOMAIN_LABEL[signal.domain]}</p>
        <div style={titleRowStyle}>
          <h1 style={titleStyle}>{headline}</h1>
          <p style={dollarStyle}>{formatCurrency(signal.annualValue)} / yr</p>
        </div>
        <span style={severityBadgeStyle}>
          {SEVERITY_LABEL[signal.severity]}
        </span>
      </header>

      <section
        aria-label="Recommended action"
        style={{ display: "flex", flexDirection: "column", gap: 12 }}
      >
        <h2 style={sectionTitleStyle}>RECOMMENDED ACTION</h2>
        <div style={actionCardStyle}>
          <p
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: 18,
              color: "var(--color-text)",
              margin: 0,
            }}
          >
            {action.headline}
          </p>
          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 14,
              color: "var(--color-text-mid)",
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            {action.body}
          </p>
          {action.cta && (
            <Link href={action.cta.href} style={ctaStyle}>
              {action.cta.label} &rarr;
            </Link>
          )}
        </div>
      </section>

      <section
        aria-label="Signal history"
        style={{ display: "flex", flexDirection: "column", gap: 16 }}
      >
        <h2 style={sectionTitleStyle}>HISTORY</h2>
        <ul style={timelineStyle}>
          {timeline.map((e, i) => (
            <li key={`${e.timestamp}-${i}`} style={timelineRowStyle}>
              <span style={timestampStyle}>{formatDate(e.timestamp)}</span>
              <div>
                <div style={eventLabelStyle}>{e.label}</div>
                {e.detail && <div style={eventDetailStyle}>{e.detail}</div>}
              </div>
              <span style={dollarColumnStyle}>
                {e.dollarMagnitude !== null
                  ? `${formatCurrency(e.dollarMagnitude)}/yr`
                  : ""}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section
        aria-label="Related notifications"
        style={{ display: "flex", flexDirection: "column", gap: 16 }}
      >
        <h2 style={sectionTitleStyle}>RELATED NOTIFICATIONS</h2>
        {notifications.length === 0 ? (
          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 13,
              color: "var(--color-text-mid)",
              margin: 0,
            }}
          >
            No notifications have been emitted for this signal yet.
          </p>
        ) : (
          <ul style={timelineStyle}>
            {notifications.map((n) => (
              <li key={n.id} style={notifRowStyle}>
                <span style={timestampStyle}>{formatDate(n.createdAt)}</span>
                <span
                  style={{
                    ...timestampStyle,
                    color: "var(--color-text-mid)",
                  }}
                >
                  {KIND_LABEL[n.kind]}
                </span>
                <div>
                  <div style={eventLabelStyle}>{n.title}</div>
                  {n.body && <div style={eventDetailStyle}>{n.body}</div>}
                </div>
                <span style={dollarColumnStyle}>
                  {n.dollarImpact !== null
                    ? `${formatCurrency(n.dollarImpact)}/yr`
                    : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
