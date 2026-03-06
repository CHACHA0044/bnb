import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Static export for production-ready static site */
  output: "export",
  images: {
    unoptimized: true, // required for static export; optimise via CDN in production
  },
};

export default nextConfig;
