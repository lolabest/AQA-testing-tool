import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@testpilot/ui"],
  poweredByHeader: false,
  reactStrictMode: true,
};

export default nextConfig;
