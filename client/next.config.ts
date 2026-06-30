import type { NextConfig } from "next";

const BACKEND_URL =
  process.env.BACKEND_URL ?? "https://karush2807-bodhi-backend.hf.space";

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ["hugeicons-react"],
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${BACKEND_URL}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
