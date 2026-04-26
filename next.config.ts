import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // NOTE: `cacheComponents: true` (which would enable the `'use cache'`
  // directive AND auto-PPR) is intentionally NOT enabled here. Turning it on
  // requires every page that accesses uncached data to wrap it in <Suspense>
  // (including the existing /[...slug] CMS page and /preview), which is a
  // larger refactor than the diagnostics pass aimed at.
  //
  // The use-cache and on-demand diagnostics use the legacy `unstable_cache`
  // API instead, which works without the flag. To test the new directive,
  // enable cacheComponents here, refactor /[...slug] + /preview to wrap
  // their async work in <Suspense>, and the diagnostic pages can be
  // updated to match.
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.cms.optimizely.com',
      },
      {
        protocol: 'https',
        hostname: 'cdn.optimizely.com',
      },
      {
        protocol: 'https',
        hostname: '*.cmp.optimizely.com',
      },
      {
        protocol: 'https',
        hostname: 'placehold.co',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Permissions-Policy',
            value: 'unload=(self)',
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: '/',
        destination: '/en',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
