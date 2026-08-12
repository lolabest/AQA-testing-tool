import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  transpilePackages: ["@testpilot/ui"],
  poweredByHeader: false,
  reactStrictMode: true,
};

export default nextConfig;
