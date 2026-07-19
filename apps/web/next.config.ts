import type { NextConfig } from 'next';

const isMobileExport = process.env.NEXT_OUTPUT === 'export';

const nextConfig: NextConfig = {
  // For mobile (Capacitor): static export. For web: standard SSR.
  ...(isMobileExport
    ? {
        output: 'export',
        images: { unoptimized: true },
        trailingSlash: true,
      }
    : {}),

  // Transpile workspace packages
  transpilePackages: ['@saas/core', '@saas/shared', '@saas/ui'],

  // Strict mode for catching bugs
  reactStrictMode: true,

  // Experimental features
  experimental: {
    // Enable typed routes
    typedRoutes: true,
  },
};

export default nextConfig;
