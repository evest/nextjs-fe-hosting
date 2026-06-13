import { resizeImageUrl } from '@/lib/image-cdn';

/**
 * Custom `next/image` loader (wired via `images.loader: 'custom'` +
 * `images.loaderFile` in next.config.ts). Replaces the default
 * `/_next/image?url=…` optimizer — which runs on our single-region Azure
 * origin — with edge resizing on the Optimizely image CDNs.
 *
 * Next calls this once per entry in the generated `srcSet` (one `width` per
 * device/image size), so returning a width-specific URL gives the browser a
 * real responsive set, resized at the edge in every region.
 *
 * `resizeImageUrl` owns the per-host contract (Cloudflare path-prefix for CMS
 * assets, query-string for CMP/DAM) and passes through any host it doesn't own
 * — placehold.co, local `/…` assets — so those render at their original size,
 * unoptimized. That's the deliberate trade for skipping the origin hop; the
 * remote hosts we actually serve content from are all covered.
 *
 * Note: with this loader active, `images.formats` no longer applies (format
 * negotiation moves to the CDN: `format=auto` for CMS, CDN default for CMP).
 */
export default function optimizelyImageLoader({
  src,
  width,
  quality,
}: {
  src: string;
  width: number;
  quality?: number;
}): string {
  return resizeImageUrl(src, { width, quality });
}
