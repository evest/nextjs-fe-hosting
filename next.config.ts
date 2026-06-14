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
    // Custom loader: resize at the Optimizely image CDNs (Cloudflare for CMS
    // assets, the CMP/DAM CDN for DAM assets) instead of the built-in
    // `/_next/image` optimizer, which runs on our single-region Azure origin.
    // Edge resizing happens in every region and skips the origin hop — the LCP
    // win on throttled mobile. See src/lib/image-loader.ts + image-cdn.ts for
    // the per-host URL contracts.
    //
    // With a custom loader, `images.formats` and `images.remotePatterns` no
    // longer apply — they only configure the built-in optimizer, which is now
    // bypassed. Format negotiation moves to the CDN (`format=auto` for CMS;
    // the CMP CDN picks its own). Hosts the loader doesn't recognise
    // (placehold.co, local assets) are served unoptimized at their natural size.
    loader: 'custom',
    loaderFile: './src/lib/image-loader.ts',
  },
  // Strip Next.js's legacy-browser polyfill bundle. Next loads
  // `polyfill-module` UNCONDITIONALLY — independent of our (modern)
  // browserslist — so it ships ~13 KiB of polyfills for Array.prototype.at,
  // Object.hasOwn, String.prototype.trimStart, etc. that every browser we
  // target (Chrome/Edge 111+, Safari 16.4+) supports natively. Lighthouse
  // flags this as "legacy JavaScript". Aliasing the module to `false` removes
  // it from the bundle. Tracked upstream in vercel/next.js#86785.
  //
  // NOTE: `next build` here uses webpack (no --turbopack flag). If the build
  // ever switches to Turbopack, this won't apply — Turbopack needs
  // `turbopack.resolveAlias` pointing at an empty module instead.
  webpack(config) {
    config.resolve.alias = {
      ...config.resolve.alias,
      'next/dist/build/polyfills/polyfill-module': false,
    };
    return config;
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
