"use client";

import { useEffect, useState, type CSSProperties, type ReactElement } from "react";
import PerimeterSVG from "@/components/watch/PerimeterSVG";
import ThresholdCompositeList from "@/components/watch/ThresholdCompositeList";
import WatchLogFeed from "@/components/watch/WatchLogFeed";
import SentinelHero from "@/components/watch/SentinelHero";
import { useMockWatchStatus } from "@/lib/vigilance/mockWatchStatus";
import { useMockPerimeterData } from "@/lib/vigilance/mockPerimeterData";
import { useMockThresholds } from "@/lib/vigilance/mockThresholds";
import { useMockWatchLog } from "@/lib/vigilance/mockWatchLog";

const DESKTOP_BREAKPOINT = 960;
const MOBILE_BREAKPOINT = 480;

function usePerimeterSize(): number {
  const [size, setSize] = useState<number>(480);
  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      if (w < MOBILE_BREAKPOINT) {
        setSize(280);
      } else if (w < DESKTOP_BREAKPOINT) {
        setSize(320);
      } else {
        setSize(480);
      }
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return size;
}

function SkeletonBlock({ height, width }: { height: number; width: number | string }): ReactElement {
  return (
    <div
      aria-hidden="true"
      style={{
        height,
        width,
        borderRadius: 2,
        backgroundColor: "var(--color-surface-2)",
        opacity: 0.55,
      }}
    />
  );
}

function PerimeterSkeleton({ size }: { size: number }): ReactElement {
  return (
    <div
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        border: "0.5px dashed var(--color-border)",
        opacity: 0.55,
      }}
    />
  );
}

export default function SentinelPage(): ReactElement {
  const watchMock = useMockWatchStatus("active");
  const watchStatus = watchMock.data;
  const perimeter = useMockPerimeterData("realistic");
  const { thresholds, isLoading: thresholdsLoading } = useMockThresholds("realistic");
  const { data: watchLogData, isLoading: watchLogLoading, loadMore } = useMockWatchLog(
    "active_morning",
  );
  const perimeterSize = usePerimeterSize();

  const wrapperStyle: CSSProperties = {
    maxWidth: 1200,
    margin: "0 auto",
    padding: "32px 24px 64px",
    display: "flex",
    flexDirection: "column",
    gap: 40,
  };

  const perimeterSectionStyle: CSSProperties = {
    display: "grid",
    gridTemplateColumns: "minmax(0, 60%) minmax(0, 40%)",
    gap: 32,
    alignItems: "start",
  };

  const summaryLabelStyle: CSSProperties = {
    fontFamily: "var(--font-mono)",
    fontSize: 10,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "var(--color-text-muted)",
    margin: 0,
  };

  const signalsMonitored = watchStatus?.signalsMonitored ?? 0;
  const signalsActive = watchStatus?.signalsActive ?? 0;
  const signalsNew = watchStatus?.signalsNew ?? 0;

  const activeColor =
    signalsActive === 0
      ? "var(--color-text-muted)"
      : signalsActive >= 3
        ? "var(--color-negative)"
        : "var(--color-gold)";

  return (
    <>
      <style>{`
        @media (max-width: 960px) {
          .illumin-sentinel-wrap {
            gap: 32px !important;
          }
          .illumin-sentinel-perimeter-row {
            grid-template-columns: 1fr !important;
          }
          .illumin-sentinel-perimeter-visual {
            justify-content: center !important;
          }
        }
        @media (max-width: 480px) {
          .illumin-sentinel-wrap {
            padding-left: 12px !important;
            padding-right: 12px !important;
          }
        }
      `}</style>
      <main
        aria-label="Sentinel. What Illumin is watching on your behalf."
        className="illumin-sentinel-wrap"
        style={wrapperStyle}
      >
        {watchStatus ? (
          <SentinelHero watchStatus={watchStatus} />
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 16,
              paddingBottom: 24,
              borderBottom: "0.5px solid var(--color-border)",
            }}
          >
            <SkeletonBlock height={32} width={220} />
            <SkeletonBlock height={14} width={300} />
            <SkeletonBlock height={40} width="100%" />
          </div>
        )}

        <section
          aria-label="Watched perimeter"
          className="illumin-sentinel-perimeter-row"
          style={perimeterSectionStyle}
        >
          <div
            className="illumin-sentinel-perimeter-visual"
            style={{ display: "flex", justifyContent: "flex-start" }}
          >
            {watchStatus ? (
              <PerimeterSVG
                cashAmount={perimeter.cashAmount}
                signals={perimeter.signals}
                size={perimeterSize}
              />
            ) : (
              <PerimeterSkeleton size={perimeterSize} />
            )}
          </div>
          <aside
            aria-label="Perimeter summary"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 20,
            }}
          >
            <p style={summaryLabelStyle}>WATCHED PERIMETER</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 24,
                    fontWeight: 500,
                    color: "var(--color-text)",
                    lineHeight: 1,
                  }}
                >
                  {signalsMonitored} monitored
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "var(--color-text-muted)",
                    marginTop: 4,
                  }}
                >
                  SIGNALS
                </div>
              </div>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 16,
                  color: activeColor,
                }}
              >
                {signalsActive} active
              </div>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 16,
                  color:
                    signalsNew > 0
                      ? "var(--color-text-mid)"
                      : "var(--color-text-muted)",
                }}
              >
                {signalsNew} new since last visit
              </div>
            </div>
            <p
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 12,
                color: "var(--color-text-mid)",
                lineHeight: 1.6,
                maxWidth: 280,
                margin: 0,
              }}
            >
              Illumin scans 4×/day and on every sync. Each scan inspects the full
              perimeter for drift, breaches, and new opportunities.
            </p>
          </aside>
        </section>

        <section
          aria-label="Thresholds under watch"
          style={{ display: "flex", flexDirection: "column", gap: 16 }}
        >
          <div
            style={{
              paddingBottom: 8,
              borderBottom: "0.5px solid var(--color-border)",
            }}
          >
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
              THRESHOLDS UNDER WATCH
            </p>
          </div>
          {thresholdsLoading ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 16,
              }}
            >
              <SkeletonBlock height={120} width="100%" />
              <SkeletonBlock height={120} width="100%" />
              <SkeletonBlock height={120} width="100%" />
              <SkeletonBlock height={120} width="100%" />
            </div>
          ) : (
            <ThresholdCompositeList thresholds={thresholds} />
          )}
        </section>

        <WatchLogFeed
          data={watchLogData}
          isLoading={watchLogLoading}
          onLoadMore={loadMore}
          meta="last 24h"
        />
      </main>
    </>
  );
}
