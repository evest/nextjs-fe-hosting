/**
 * Per-host image-CDN URL rewriting, shared by the `next/image` custom loader
 * (`image-loader.ts`) and the OG-image builder (`seo.ts`).
 *
 * Optimizely serves images from two distinct CDNs with *incompatible* resize
 * contracts, so a single rewrite can't cover both — we branch on hostname:
 *
 *   1. CMS managed assets — `*.cms.optimizely.com`
 *      Fronted by Cloudflare Image Transformations, addressed via the
 *      **path-prefix** form `/cdn-cgi/image/<options>/<path>`. Query-string
 *      params (`?width=…`) are silently ignored on this zone (verified: a 16:9
 *      source comes back untouched), so we must rewrite the path, not append.
 *      Supports width, height, quality, fit and `format=auto` (edge WebP/AVIF
 *      negotiation).
 *
 *   2. CMP / DAM assets — `images-cdn.optimizely.com`, `*.cmp.optimizely.com`
 *      Now (2026-06) also fronted by Cloudflare Image Transformations, addressed
 *      via the SAME `/cdn-cgi/image/<options>/<path>` path-prefix form as the CMS
 *      zone — so it supports width, quality, and format conversion. The key
 *      difference: the DAM does NOT set `format=auto` by default (a bare asset
 *      URL returns the original PNG/JPEG), so we force it. Width is not clamped
 *      to the source, so we cap it (see CMP_MAX_WIDTH).
 *
 * Anything else (placehold.co, local `/…` assets, already-transformed URLs,
 * unparseable values) is returned unchanged — the loader is global and must be
 * a safe pass-through for hosts it doesn't own.
 *
 * Must stay free of server-only imports: this module is pulled into the
 * `next/image` loader, which Next bundles for the client too.
 */

const CMS_HOST_SUFFIX = '.cms.optimizely.com';
const CMP_HOST_SUFFIX = '.cmp.optimizely.com';
const CMP_HOST_EXACT = 'images-cdn.optimizely.com';

const CLOUDFLARE_PREFIX = '/cdn-cgi/image/';

type ResizeOptions = {
  width: number;
  /** Cloudflare quality (1-100). */
  quality?: number;
};

function isCmsHost(hostname: string): boolean {
  return hostname.endsWith(CMS_HOST_SUFFIX);
}

function isCmpHost(hostname: string): boolean {
  return hostname === CMP_HOST_EXACT || hostname.endsWith(CMP_HOST_SUFFIX);
}

/**
 * True if the host is an Optimizely image CDN fronted by Cloudflare Image
 * Transformations (the `/cdn-cgi/image/<options>/<path>` form). Both the CMS
 * asset zone and the CMP/DAM zone qualify (verified 2026-06: the DAM moved to
 * Cloudflare and supports the same transform options — width, height, fit,
 * quality, format=auto).
 */
export function isCloudflareImageHost(hostname: string): boolean {
  return isCmsHost(hostname) || isCmpHost(hostname);
}

/**
 * Rewrite any Cloudflare-fronted Optimizely asset URL (CMS or CMP/DAM) through
 * the `/cdn-cgi/image/<options>/<path>` transform. `transform` is the raw
 * Cloudflare options string, e.g. `format=auto,width=1200,height=630,fit=cover`.
 *
 * Returns the URL unchanged when: it's unparseable, the host isn't a Cloudflare
 * image host (so we never hand a scraper/loader a broken link), or it already
 * carries the prefix (idempotent — no double-wrapping). Any existing query
 * string on the asset is preserved.
 *
 * This is the single place that knows the prefix shape; cmsResizeUrl,
 * cmpResizeUrl, and the OG-image builder in seo.ts all compose their options
 * and delegate here.
 */
export function cloudflareTransformUrl(rawUrl: string | undefined, transform: string): string | undefined {
  if (!rawUrl) return rawUrl;
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return rawUrl;
  }
  if (!isCloudflareImageHost(parsed.hostname)) return rawUrl;
  if (parsed.pathname.startsWith(CLOUDFLARE_PREFIX)) return rawUrl;
  return `${parsed.origin}${CLOUDFLARE_PREFIX}${transform}${parsed.pathname}${parsed.search}`;
}

// Both CDN zones (CMS and CMP/DAM) are Cloudflare-fronted and accept the same
// transform options. They differ in two ways the resize path cares about:
//   - The CMP/DAM CDN does NOT clamp the requested width to the source, so a
//     large `width` returns a large render (width=4000 on a small asset → ~1 MB,
//     verified). next/image sets the bare `src` to the largest srcSet width as a
//     fallback, which a `sizes`-ignoring consumer (crawlers, an OG/JSON-LD
//     reference) can pull — so we cap CMP widths. 1920 covers a full-width image
//     on a 2× desktop; larger srcSet entries reuse the 1920 render, imperceptible
//     at those sizes but bounding the payload. (The CMS zone clamps to source, so
//     it needs no cap.)
//   - `format=auto`: the CMS zone sets it by default; the CMP/DAM zone does NOT
//     (a bare asset URL returns the original PNG/JPEG), so we force it on both
//     here for consistency. Verified: a 12.8 KB DAM PNG → 1.2 KB AVIF at width=96.
const CMP_MAX_WIDTH = 1920;

/**
 * Resize an absolute image URL to `width` via whichever Optimizely image CDN
 * owns its host. Returns the input unchanged for any other host, or for an
 * unparseable value — callers can hand the result straight to `<img>`/`next/image`.
 * No height: width-only keeps the source aspect ratio, which is what a responsive
 * `srcSet` wants.
 */
export function resizeImageUrl(rawUrl: string, { width, quality }: ResizeOptions): string {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return rawUrl;
  }
  // CMP/DAM widths are capped (it doesn't clamp to source); CMS is left as-is.
  const w = isCmpHost(parsed.hostname) ? Math.min(width, CMP_MAX_WIDTH) : width;
  const transform = `format=auto,width=${w},quality=${quality ?? 75}`;
  return cloudflareTransformUrl(rawUrl, transform) ?? rawUrl;
}
