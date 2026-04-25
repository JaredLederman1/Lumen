// Validate required env vars at startup -- throws if any are missing
import './lib/env'

import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-parse"],
};

export default withSentryConfig(nextConfig, {
  org: "illumin",
  project: "illumin-web",
  silent: true,
  widenClientFileUpload: true,
  // Replacement (webpack.treeshake.removeDebugLogging) is webpack-only; keep disableLogger until Sentry ships a Turbopack-compatible option.
  disableLogger: true,
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },
});
