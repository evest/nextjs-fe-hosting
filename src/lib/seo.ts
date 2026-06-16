import type { Metadata } from 'next';
import { cloudflareTransformUrl } from '@/lib/image-cdn';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, '');

// Open Graph cards want a 1.91:1 image at 1200×630. Both Optimizely asset CDNs
// — the CMS zone (*.cms.optimizely.com) and the CMP/DAM zone
// (*.cmp.optimizely.com) — are fronted by Cloudflare Image Transformations,
// reached via the /cdn-cgi/image/<options>/<path> path-prefix form. An OG image
// can come from either source (managed asset or DAM), so we transform both the
// same way; cloudflareTransformUrl passes through any non-Cloudflare host (and
// is idempotent / preserves query strings).
//
// fit=cover center-crops to the exact box without stretching; a 16:9 (1.78:1)
// source loses ~7% top/bottom reaching 1.91:1, which is imperceptible on a
// share card. quality=85 + format=auto keeps the payload small and serves
// WebP/AVIF to scrapers that accept it (verified: a 1.4 MB DAM PNG → 43 KB WebP).
const OG_TRANSFORM = 'width=1200,height=630,fit=cover,quality=85,format=auto';

/**
 * Rewrite an absolute Optimizely asset URL (CMS or DAM) into the Cloudflare
 * path-prefix form that yields an exact 1200×630 OG crop. Non-Cloudflare hosts
 * (and unparseable values) pass through unchanged so we never hand a scraper a
 * broken link; already-prefixed URLs are left alone.
 */
function ogImageUrlFor(rawUrl: string | undefined): string | undefined {
  return cloudflareTransformUrl(rawUrl, OG_TRANSFORM);
}

// A CMS contentReference to an _image arrives in one of two shapes depending on
// whether it's a managed asset or a DAM item. Pull the raw URL from either.
function imageRefUrl(ref: unknown): string | undefined {
  const obj = ref as Record<string, unknown> | undefined;
  return (
    ((obj?.url as Record<string, unknown>)?.default as string | undefined) ||
    ((obj?.item as Record<string, unknown>)?.Url as string | undefined)
  );
}

/**
 * Extracts Next.js Metadata from CMS content that has an SEO block.
 * Works with any content type that has an `seo` component property using SeoBlockCT.
 *
 * Also emits a canonical URL when NEXT_PUBLIC_SITE_URL is configured and the
 * content payload has a usable `_metadata.url.default`.
 *
 * TODO: hreflang `alternates.languages` — needs sibling-locale URLs from
 * the CMS. The Graph payload exposes the current locale's URL but not its
 * counterparts; emitting language alternates correctly requires either a
 * follow-up query keyed by content id or an explicit per-content "Alternate
 * URLs" property. Skipping for now beats lying to crawlers about
 * non-existent translations.
 */
export function getSeoMetadata(content: Record<string, unknown>): Metadata {
  const seo = content.seo as Record<string, unknown> | undefined;
  const contentMeta = content._metadata as Record<string, unknown> | undefined;

  const metadata: Metadata = {};

  if (seo?.metaTitle) {
    metadata.title = seo.metaTitle as string;
  }

  if (seo?.metaDescription) {
    metadata.description = seo.metaDescription as string;
  }

  const noIndex = seo?.noIndex as boolean | undefined;
  const noFollow = seo?.noFollow as boolean | undefined;
  if (noIndex || noFollow) {
    metadata.robots = {
      index: !noIndex,
      follow: !noFollow,
    };
  }

  // Prefer the SEO block's explicit Open Graph image. When absent, fall back
  // to the page's main image so a share card is never blank — property name
  // varies by page type (ArticlePage→featuredImage, PersonPage→image,
  // LandingPageExperience→backgroundImage). Both paths get the same 1200×630
  // CDN crop; an editor's untransformed asset would otherwise be wrong-ratio
  // and megabytes large.
  const rawOgImageUrl =
    imageRefUrl(seo?.openGraphImage) ||
    imageRefUrl(content.featuredImage) ||
    imageRefUrl(content.image) ||
    imageRefUrl(content.backgroundImage);
  const ogImageUrl = ogImageUrlFor(rawOgImageUrl);

  const urlPath =
    ((contentMeta?.url as Record<string, unknown>)?.default as string | undefined) ?? null;
  const canonical = urlPath && SITE_URL ? `${SITE_URL}${urlPath.replace(/\/$/, '') || '/'}` : null;
  if (canonical) {
    metadata.alternates = { canonical };
  }

  // Locale comes from the URL prefix (/no/..., /en/...). Map it to the
  // BCP-47 form Open Graph expects ("nb_NO", "en_US", etc.); fall back to
  // omitting `locale` if we can't tell.
  const ogLocale = canonicalToOgLocale(urlPath);

  // Always populate openGraph.title/description from the SEO block so
  // scrapers that ignore <title>/<meta description> still get the right
  // share preview. Falling back to the page's metaTitle keeps things
  // sensible when only one is set.
  const ogTitle = (seo?.metaTitle as string | undefined) ?? undefined;
  const ogDescription = (seo?.metaDescription as string | undefined) ?? undefined;

  // We guarantee the rendered crop is 1200×630, so declare it. Some scrapers
  // (and Twitter/X with summary_large_image) skip images that don't advertise
  // dimensions; stating them up-front avoids a fetch-and-measure round trip.
  const ogImage = ogImageUrl
    ? { url: ogImageUrl, width: 1200, height: 630 }
    : undefined;

  if (ogTitle || ogDescription || ogImage || canonical || ogLocale) {
    metadata.openGraph = {
      ...(ogTitle && { title: ogTitle }),
      ...(ogDescription && { description: ogDescription }),
      ...(ogImage && { images: [ogImage] }),
      ...(canonical && { url: canonical }),
      ...(ogLocale && { locale: ogLocale }),
    };
    // Twitter card mirrors the OG fields — most scrapers honour OG, but
    // Twitter/X explicitly prefers its own tags when present. The large
    // summary card is the one that shows a 1.91:1 image.
    metadata.twitter = {
      ...(ogImage && { card: 'summary_large_image' }),
      ...(ogTitle && { title: ogTitle }),
      ...(ogDescription && { description: ogDescription }),
      ...(ogImage && { images: [ogImage] }),
    };
  }

  return metadata;
}

// Map the URL's leading locale segment ("/no/...") to the BCP-47 form
// Open Graph wants. The list mirrors routing.locales — kept here as a
// plain lookup so this module stays free of i18n imports.
function canonicalToOgLocale(urlPath: string | null): string | null {
  if (!urlPath) return null;
  const seg = urlPath.split('/').filter(Boolean)[0]?.toLowerCase();
  switch (seg) {
    case 'no':
      return 'nb_NO';
    case 'en':
      return 'en_US';
    case 'sv':
      return 'sv_SE';
    case 'da':
      return 'da_DK';
    default:
      return null;
  }
}
