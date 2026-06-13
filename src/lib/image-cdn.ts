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
 *      Resized via **query string** only, and a much smaller option set:
 *      `width`, `height`, `center_width`, `center_height`. No quality or format
 *      control — the DAM picks those. Aspect ratio is preserved (crop/letterbox).
 *      Docs: https://docs.developers.optimizely.com/content-marketing-platform/docs/feed-api#dynamically-resize-images-from-the-optimizely-cmp-api
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

// The CMP/DAM CDN does no format conversion (PNG/JPEG stay as-is, no WebP/AVIF)
// and — unlike Cloudflare — does not clamp the requested width to the source.
// So `width=3840` returns the full-resolution original: an 8.5 MB PNG for a
// 48px avatar (verified live). next/image always sets the bare `src` to the
// largest srcSet width as a fallback, so a `sizes`-ignoring consumer (some
// crawlers, an OG/JSON-LD reference) can pull that multi-MB file. Cap the width
// at a realistic display ceiling so no generated URL can request the original.
// 1920 covers a full-width image on a 2× desktop; larger srcSet entries reuse
// the 1920 render, which is imperceptible at those sizes but bounds the payload.
const CMP_MAX_WIDTH = 1920;

/**
 * Append `?width=…` to a CMP/DAM URL, clamped to {@link CMP_MAX_WIDTH}.
 * Quality/format aren't supported by this CDN, so they're dropped. A pre-existing
 * `width` param is overwritten so a responsive `srcSet` produces distinct widths
 * rather than repeating the source's.
 */
function cmpResizeUrl(parsed: URL, { width }: ResizeOptions): string {
  parsed.searchParams.set('width', String(Math.min(width, CMP_MAX_WIDTH)));
  return parsed.href;
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
