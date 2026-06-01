import { resolve } from "node:path";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // Enables the `'use cache'` directive and auto-PPR. The localized catch-all
  // (/[locale]/[[...slug]]) reads CMS content via a `'use cache'` wrapper, so
  // the whole page caches; /preview is explicitly `force-dynamic` and reflects
  // editor edits on every load.
  cacheComponents: true,

  // Optimizely DXP shared Redis cache handler. With `cacheMaxMemorySize: 0`
  // Next.js does not keep a duplicate in-process LRU; the handler (Redis
  // in production, in-memory Map locally) is the sole source of truth.
  // This is what lets `revalidateTag` / `revalidatePath` reach every
  // replica behind the load balancer.
  cacheHandler: resolve(process.cwd(), "cache-handler.mjs"),
  cacheMaxMemorySize: 0,

  images: {
    // Serve modern formats from the next/image optimizer. AVIF is not enabled
    // by default (Next ships WebP only); adding it lets the optimizer pick the
    // smallest encoding the browser accepts, which Lighthouse's
    // image-delivery-insight flagged. AVIF is listed first so it's preferred,
    // with WebP as the fallback for browsers that don't accept AVIF.
    formats: ['image/avif', 'image/webp'],
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
      {
        // Static, content-addressed public assets (logos, icons, fonts) are
        // immutable for a given deploy. Lighthouse's cache-insight flagged the
        // logo SVGs as cached only 4h; serve them with a 1-year immutable TTL
        // so repeat visits hit cache. These files don't carry build hashes, so
        // if a logo is *replaced* its filename should change (or this TTL
        // shortened) to avoid stale caching.
        source: '/:path*(svg|jpg|jpeg|png|gif|webp|avif|ico|woff|woff2)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
  // Locale routing — including the `/` → `/no` redirect — is handled by the
  // next-intl middleware (src/proxy.ts). No explicit redirects needed.
};

export default withNextIntl(nextConfig);
