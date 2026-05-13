import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  distDir: "dist",
  // Required for FiveM NUI: assets must use relative paths
  assetPrefix: "./",
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
