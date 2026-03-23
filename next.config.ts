import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["pg", "pg-pool"],
  // Allow tests to use a separate dist dir so `next dev` doesn't conflict
  // with a running dev server on the default `.next` path.
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  turbopack: {
    // Pin the workspace root to this repo to avoid false detection of a
    // parent-directory lockfile.
    root: __dirname,
  },
};

export default nextConfig;
