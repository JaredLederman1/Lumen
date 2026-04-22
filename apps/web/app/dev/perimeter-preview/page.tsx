// DEV PREVIEW ONLY — to be removed before launch.
"use client";

import type { CSSProperties } from "react";
import PerimeterSVG from "@/components/watch/PerimeterSVG";
import ThresholdBar from "@/components/watch/ThresholdBar";
import ThresholdBarList from "@/components/watch/ThresholdBarList";
import ThresholdGauge from "@/components/watch/variants/ThresholdGauge";
import ThresholdStrip from "@/components/watch/variants/ThresholdStrip";
import ThresholdPill from "@/components/watch/variants/ThresholdPill";
import ThresholdTrajectory from "@/components/watch/variants/ThresholdTrajectory";
import ThresholdDots from "@/components/watch/variants/ThresholdDots";
import {
  useMockPerimeterData,
  type PerimeterScenario,
} from "@/lib/vigilance/mockPerimeterData";
import {
  mockImpactCopy,
  useMockThresholds,
  type MockThresholdScenario,
} from "@/lib/vigilance/mockThresholds";

const PERIMETER_SCENARIOS: PerimeterScenario[] = [
  "realistic",
  "sparse",
  "saturated",
  "clean",
  "urgent",
];

const THRESHOLD_LIST_MAX_WIDTH = 640;

const pageStyle: CSSProperties = {
  minHeight: "100vh",
  padding: "48px 32px 96px",
  backgroundColor: "var(--color-bg)",
};

const pageHeadingStyle: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "var(--color-text-muted)",
  margin: "0 0 32px 0",
};

const sectionHeadingStyle: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "var(--color-text-mid)",
  margin: "0 0 20px 0",
};

const dividerStyle: CSSProperties = {
  border: "none",
  borderTop: "0.5px solid var(--color-border)",
  margin: "56px 0 40px 0",
};

const gridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))",
  gap: 32,
  alignItems: "start",
};

const cellStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  padding: 24,
  border: "0.5px solid var(--color-border)",
  borderRadius: "var(--radius-lg)",
  backgroundColor: "var(--color-surface)",
};

const thresholdStackStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 32,
};

const thresholdCellStyle: CSSProperties = {
  maxWidth: THRESHOLD_LIST_MAX_WIDTH,
  padding: 24,
  border: "0.5px solid var(--color-border)",
  borderRadius: "var(--radius-lg)",
  backgroundColor: "var(--color-surface)",
};

const labelStyle: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: "var(--color-text-mid)",
  marginBottom: 16,
};

const emptyHintStyle: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  color: "var(--color-text-muted)",
  padding: "12px 0",
};

function PerimeterScenarioCell({ scenario }: { scenario: PerimeterScenario }) {
  const { cashAmount, signals } = useMockPerimeterData(scenario);
  return (
    <div style={cellStyle}>
      <p style={labelStyle}>{scenario}</p>
      <PerimeterSVG cashAmount={cashAmount} signals={signals} size={400} />
    </div>
  );
}

function ThresholdListCell({
  scenario,
  label,
  compact = false,
}: {
  scenario: MockThresholdScenario;
  label: string;
  compact?: boolean;
}) {
  const { thresholds } = useMockThresholds(scenario);
  return (
    <div style={thresholdCellStyle}>
      <p style={labelStyle}>{label}</p>
      {thresholds.length === 0 ? (
        <div style={emptyHintStyle}>No thresholds monitored yet.</div>
      ) : (
        <ThresholdBarList
          thresholds={thresholds}
          compact={compact}
          impactCopyFor={t => mockImpactCopy(t.gapId)}
        />
      )}
    </div>
  );
}

function SingleThresholdCell() {
  const { thresholds } = useMockThresholds("realistic");
  const first = thresholds[0];
  return (
    <div style={thresholdCellStyle}>
      <p style={labelStyle}>single bar · realistic[0]</p>
      <ThresholdBar threshold={first} impactCopy={mockImpactCopy(first.gapId)} />
    </div>
  );
}

function VariantsSection() {
  const { thresholds } = useMockThresholds("realistic");

  const gaugeGridStyle: CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: 16,
    maxWidth: 800,
    padding: 24,
    border: "0.5px solid var(--color-border)",
    borderRadius: "var(--radius-lg)",
    backgroundColor: "var(--color-surface)",
  };

  const stackCellStyle = (gap: number): CSSProperties => ({
    display: "flex",
    flexDirection: "column",
    gap,
    maxWidth: 640,
    padding: 24,
    border: "0.5px solid var(--color-border)",
    borderRadius: "var(--radius-lg)",
    backgroundColor: "var(--color-surface)",
  });

  return (
    <section>
      <h2 style={sectionHeadingStyle}>Threshold visualization alternatives</h2>
      <div style={thresholdStackStyle}>
        <div>
          <p style={labelStyle}>option 1 · gauge</p>
          <div style={gaugeGridStyle}>
            {thresholds.map(t => (
              <ThresholdGauge key={t.gapId} threshold={t} />
            ))}
          </div>
        </div>
        <div>
          <p style={labelStyle}>option 2 · temperature strip</p>
          <div style={stackCellStyle(12)}>
            {thresholds.map(t => (
              <ThresholdStrip key={t.gapId} threshold={t} />
            ))}
          </div>
        </div>
        <div>
          <p style={labelStyle}>option 3 · pill and delta</p>
          <div style={stackCellStyle(8)}>
            {thresholds.map(t => (
              <ThresholdPill key={t.gapId} threshold={t} />
            ))}
          </div>
        </div>
        <div>
          <p style={labelStyle}>option 4 · trajectory</p>
          <div style={stackCellStyle(16)}>
            {thresholds.map(t => (
              <ThresholdTrajectory key={t.gapId} threshold={t} />
            ))}
          </div>
        </div>
        <div>
          <p style={labelStyle}>option 5 · distance dots</p>
          <div style={stackCellStyle(12)}>
            {thresholds.map(t => (
              <ThresholdDots key={t.gapId} threshold={t} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default function PerimeterPreviewPage() {
  return (
    <div style={pageStyle}>
      <h1 style={pageHeadingStyle}>Intensity 3 component preview</h1>

      <section>
        <h2 style={sectionHeadingStyle}>Perimeter SVG</h2>
        <div style={gridStyle}>
          {PERIMETER_SCENARIOS.map(scenario => (
            <PerimeterScenarioCell key={scenario} scenario={scenario} />
          ))}
        </div>
      </section>

      <hr style={dividerStyle} />

      <section>
        <h2 style={sectionHeadingStyle}>Threshold bars</h2>
        <div style={thresholdStackStyle}>
          <SingleThresholdCell />
          <ThresholdListCell scenario="realistic" label="list · realistic" />
          <ThresholdListCell scenario="all_breached" label="list · all_breached" />
          <ThresholdListCell scenario="all_clean" label="list · all_clean" />
          <ThresholdListCell scenario="realistic" label="list · realistic · compact" compact />
          <ThresholdListCell scenario="empty" label="list · empty" />
        </div>
      </section>

      <hr style={dividerStyle} />

      <VariantsSection />
    </div>
  );
}
