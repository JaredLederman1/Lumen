// Validate required env vars at startup -- throws if any are missing
import './lib/env'

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-parse"],
};

export default nextConfig;
