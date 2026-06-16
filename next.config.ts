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

  experimental: {
    // Inline the global stylesheet as a <style> in <head> instead of a
    // render-blocking <link rel="stylesheet">. Purpose-built for atomic CSS
    // (Tailwind) per the Next docs: our sheet is ~15 KB gzipped and the mobile
    // LCP element is render-blocked text, so removing the CSS request from the
    // critical path is the one first-party lever that targets it (critters/
    // beasties are no-ops on the App Router). EXPERIMENTAL + production-only
    // (no effect in `next dev`): validated on Test2 with the Lighthouse harness.
    // Trade-off: CSS rides inside every HTML response (no separately-cacheable
    // file); fine here since the sheet is small and most HTML is PPR/CDN-cached.
    // Next falls back to <link> when navigating to prerendered pages, so it
    // composes with cacheComponents. Revert by removing this block if it
    // regresses TTFB or misbehaves.
    inlineCss: true,
  },

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
  // NOTE: Next.js ships ~13 KiB of legacy ES polyfills (Array.prototype.at,
  // Object.hasOwn, String.prototype.trimStart, etc.) to all browsers,
  // UNCONDITIONALLY — ignoring our modern browserslist — so Lighthouse flags
  // "legacy JavaScript". This is an open upstream bug (vercel/next.js#86785)
  // with NO clean fix: the polyfills come from the `polyfill-nomodule` webpack
  // ENTRYPOINT, and the widely-cited `resolve.alias` workaround targets the
  // wrong module (`polyfill-module`) so it's a no-op. Entry-filtering is
  // fragile webpack-internals hacking for a 13 KiB gain on a load-bearing
  // config. Deliberately NOT done — wait for the upstream fix. If revisiting:
  // verify via the deployed Lighthouse legacy-javascript audit, not a local
  // grep (can't distinguish polyfill-install from app code).
  //
  // TRACK — re-evaluate when this lands in our Next.js version:
  //   Issue: https://github.com/vercel/next.js/issues/86785
  //   PRs:   https://github.com/vercel/next.js/pull/87270
  //          https://github.com/vercel/next.js/pull/88551
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
