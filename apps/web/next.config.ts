import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  transpilePackages: ["shared"],
  typescript: {
    ignoreBuildErrors: true,
  },
  turbopack: {
    // Set workspace root explicitly to silence the lockfile warning
    root: path.resolve(__dirname, "../.."),
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.NEXT_PUBLIC_API_URL || "https://moveon-backend-production-c80c.up.railway.app"}/:path*`,
      },
    ];
  },
};

export default nextConfig;
