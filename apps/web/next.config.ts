import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  transpilePackages: ["@testpilot/ui"],
  poweredByHeader: false,
  reactStrictMode: true,
  // Cloud Agent port previews hit the dev server from a different origin.
  allowedDevOrigins: ["*.agent.cvm.dev", "*.cursor.sh", "localhost", "127.0.0.1"],
};

export default nextConfig;
