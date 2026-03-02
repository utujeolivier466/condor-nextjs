import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ensure middleware is properly handled
  experimental: {
    // Increase server response time limit for complex middleware
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
};

export default nextConfig;
