import type { NextConfig } from "next";

const isDevelopment = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
  output: "export",
  distDir: "dist",
  // Required for FiveM NUI: assets must use relative paths
  assetPrefix: isDevelopment ? undefined : "./",
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
