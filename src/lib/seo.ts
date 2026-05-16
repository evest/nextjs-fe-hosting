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

  if (ogImageUrl) {
    metadata.openGraph = { images: [ogImageUrl] };
  }

  const urlPath =
    ((contentMeta?.url as Record<string, unknown>)?.default as string | undefined) ?? null;
  if (urlPath && SITE_URL) {
    const canonical = `${SITE_URL}${urlPath.replace(/\/$/, '') || '/'}`;
    metadata.alternates = { canonical };
  }

  return metadata;
}
