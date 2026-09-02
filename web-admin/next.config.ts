import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Left to Node's own resolver rather than the bundler's shim. This is the
  // documented handling for firebase-admin, which has dynamic requires the
  // bundler cannot follow. It is NOT what fixed the ERR_REQUIRE_ESM crash in
  // the lambda — the `jwks-rsa` jose override in package.json did that — but
  // being explicit here means the next person does not have to guess whether
  // externalisation was intentional.
  serverExternalPackages: ["firebase-admin"],

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
