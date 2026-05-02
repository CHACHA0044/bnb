import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Static export for production-ready static site */
  output: "export",
  images: {
    unoptimized: true,
    qualities: [75, 85],
  },
};

export default nextConfig;
