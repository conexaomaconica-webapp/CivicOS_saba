import type { NextConfig } from 'next';

const isMobileExport = process.env.NEXT_OUTPUT === 'export';

const securityHeaders = [
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
  {
    key: 'Content-Security-Policy-Report-Only',
    value: "default-src 'self'; img-src 'self' data: https:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; connect-src 'self' https:;",
  },
];

const nextConfig: NextConfig = {
  // For mobile (Capacitor): static export. For web: standard SSR.
  ...(isMobileExport
    ? {
        output: 'export',
        images: { unoptimized: true },
        trailingSlash: true,
      }
    : {
        async headers() {
          return [
            {
              source: '/:path*',
              headers: securityHeaders,
            },
          ];
        },
      }),

  // Transpile workspace packages
  transpilePackages: ['@saas/core', '@saas/shared', '@saas/ui'],

  // Strict mode for catching bugs
  reactStrictMode: true,

  // Ignore ESLint errors during builds (handled in separate pipeline)
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Enable typed routes
  typedRoutes: true,
};

export default nextConfig;
