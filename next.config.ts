import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
    dirs: [], // Disable ESLint completely
  },
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    ignoreBuildErrors: true,
  },
  // Additional Vercel-specific options
  experimental: {
    esmExternals: true,
  },
  // Disable all build-time checks
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  // Server external packages
  serverExternalPackages: [],
};

export default nextConfig;
