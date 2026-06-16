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
  /** Cloudflare quality (1-100). Ignored by the CMP CDN, which has no quality knob. */
  quality?: number;
};

function isCmsHost(hostname: string): boolean {
  return hostname.endsWith(CMS_HOST_SUFFIX);
}

function isCmpHost(hostname: string): boolean {
  return hostname === CMP_HOST_EXACT || hostname.endsWith(CMP_HOST_SUFFIX);
}

/**
 * Rewrite a CMS asset URL to the Cloudflare path-prefix transform for a given
 * render width. `format=auto` lets the edge negotiate WebP/AVIF per request.
 * No height: width-only keeps the source aspect ratio, which is what a
 * responsive `srcSet` wants. Idempotent — a URL already carrying the prefix is
 * left untouched so we never double-wrap.
 */
function cmsResizeUrl(parsed: URL, { width, quality }: ResizeOptions): string {
  if (parsed.pathname.startsWith(CLOUDFLARE_PREFIX)) return parsed.href;
  const opts = `width=${width},quality=${quality ?? 75},format=auto`;
  return `${parsed.origin}${CLOUDFLARE_PREFIX}${opts}${parsed.pathname}${parsed.search}`;
}

// The CMP/DAM CDN is now (2026-06) fronted by Cloudflare Image Transformations,
// reached via the same `/cdn-cgi/image/<options>/<path>` path-prefix form as the
// CMS zone — so it CAN convert formats. Unlike the CMS zone, the DAM does NOT
// set `format=auto` by default (a bare asset URL returns the original PNG/JPEG),
// so we force it: `format=auto` negotiates AVIF/WebP per the request's Accept
// header, falling back to the original format otherwise. Verified live: a 12.8 KB
// PNG avatar comes back as a 1.5 KB AVIF with format=auto (~88% smaller).
//
// The CDN still does NOT clamp the requested width to the source, so a large
// `width` returns a large render (width=4000 on a small asset → ~1 MB, verified).
// next/image sets the bare `src` to the largest srcSet width as a fallback, which
// a `sizes`-ignoring consumer (some crawlers, an OG/JSON-LD reference) can pull —
// so we keep capping width at a realistic display ceiling. 1920 covers a
// full-width image on a 2× desktop; larger srcSet entries reuse the 1920 render,
// imperceptible at those sizes but bounding the payload.
const CMP_MAX_WIDTH = 1920;

/**
 * Rewrite a CMP/DAM asset URL to the Cloudflare path-prefix transform: forces
 * `format=auto` (the DAM doesn't set it), a width clamped to {@link CMP_MAX_WIDTH},
 * and a quality cap. Idempotent — a URL already carrying the prefix is left
 * untouched so we never double-wrap. Any existing query string on the asset is
 * preserved (the CDN honors it alongside the prefix).
 */
function cmpResizeUrl(parsed: URL, { width, quality }: ResizeOptions): string {
  if (parsed.pathname.startsWith(CLOUDFLARE_PREFIX)) return parsed.href;
  const opts = `format=auto,width=${Math.min(width, CMP_MAX_WIDTH)},quality=${quality ?? 75}`;
  return `${parsed.origin}${CLOUDFLARE_PREFIX}${opts}${parsed.pathname}${parsed.search}`;
}

/**
 * Resize an absolute image URL to `width` via whichever Optimizely image CDN
 * owns its host. Returns the input unchanged for any other host, or for an
 * unparseable value — callers can hand the result straight to `<img>`/`next/image`.
 */
export function resizeImageUrl(rawUrl: string, options: ResizeOptions): string {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return rawUrl;
  }
  if (isCmsHost(parsed.hostname)) return cmsResizeUrl(parsed, options);
  if (isCmpHost(parsed.hostname)) return cmpResizeUrl(parsed, options);
  return rawUrl;
}
