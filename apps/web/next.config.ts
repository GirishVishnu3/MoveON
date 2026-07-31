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
  // Explicitly expose Firebase config to the browser bundle.
  // This guarantees env vars work even when the shared package
  // doesn't have access to the app's .env.local during transpilation.
  env: {
    NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
    NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? "https://moveon-backend-production-c80c.up.railway.app",
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

