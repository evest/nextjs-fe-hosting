import type { Metadata } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, '');

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

  const ogImage = seo?.openGraphImage as Record<string, unknown> | undefined;
  const ogImageUrl =
    ((ogImage?.url as Record<string, unknown>)?.default as string | undefined) ||
    ((ogImage?.item as Record<string, unknown>)?.Url as string | undefined);

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

  if (ogTitle || ogDescription || ogImageUrl || canonical || ogLocale) {
    metadata.openGraph = {
      ...(ogTitle && { title: ogTitle }),
      ...(ogDescription && { description: ogDescription }),
      ...(ogImageUrl && { images: [ogImageUrl] }),
      ...(canonical && { url: canonical }),
      ...(ogLocale && { locale: ogLocale }),
    };
    // Twitter card mirrors the OG fields — most scrapers honour OG, but
    // Twitter/X explicitly prefers its own tags when present.
    metadata.twitter = {
      ...(ogTitle && { title: ogTitle }),
      ...(ogDescription && { description: ogDescription }),
      ...(ogImageUrl && { images: [ogImageUrl] }),
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
