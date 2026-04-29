import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enables the `'use cache'` directive and auto-PPR. /[...slug] reads CMS
  // content via a `'use cache'` wrapper, so the whole page caches; /preview
  // is explicitly `force-dynamic` and reflects editor edits on every load.
  cacheComponents: true,
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
