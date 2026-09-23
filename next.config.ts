import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // There is a stray package-lock.json in the home directory, and Turbopack
    // picks the outermost lockfile as the workspace root. Pinning the root here
    // keeps module resolution and file watching scoped to this project.
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
