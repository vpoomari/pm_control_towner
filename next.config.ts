import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // pptxgenjs (PPT export engine) must run from node_modules, not the bundle.
  serverExternalPackages: ["pptxgenjs"],
  // Optional override so a production build can certify into a separate directory
  // without touching the running dev server (default remains ".next").
  distDir: process.env.PMCT_DIST_DIR || ".next",
  // Pin the tracing root to this project so `.next/standalone/server.js` is
  // always emitted at the top level — even when the app is unpacked inside a
  // parent directory that contains another lockfile (monorepo/workspace detection).
  outputFileTracingRoot: __dirname,
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
