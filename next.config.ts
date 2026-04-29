import { resolve } from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enables the `'use cache'` directive and auto-PPR. /[...slug] reads CMS
  // content via a `'use cache'` wrapper, so the whole page caches; /preview
  // is explicitly `force-dynamic` and reflects editor edits on every load.
  cacheComponents: true,

  // Optimizely DXP shared Redis cache handler. With `cacheMaxMemorySize: 0`
  // Next.js does not keep a duplicate in-process LRU; the handler (Redis
  // in production, in-memory Map locally) is the sole source of truth.
  // This is what lets `revalidateTag` / `revalidatePath` reach every
  // replica behind the load balancer.
  cacheHandler: resolve(process.cwd(), "cache-handler.mjs"),
  cacheMaxMemorySize: 0,

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
