import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Article images are rendered with `unoptimized` because Firebase Storage
    // already serves them cached and immutable. These patterns are declared so
    // that turning the optimizer on later is a one-word change, not a debugging
    // session over an unconfigured-host error.
    remotePatterns: [
      { protocol: "https", hostname: "firebasestorage.googleapis.com" },
      // Newer Firebase projects serve from *.firebasestorage.app as well.
      { protocol: "https", hostname: "nilgiri-news.firebasestorage.app" },
      { protocol: "https", hostname: "i.ytimg.com" },
    ],
  },
};

export default nextConfig;
