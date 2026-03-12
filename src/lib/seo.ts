import type { Metadata } from 'next';

/**
 * Extracts Next.js Metadata from CMS content that has an SEO block.
 * Works with any content type that has an `seo` component property using SeoBlockCT.
 */
export function getSeoMetadata(content: Record<string, unknown>): Metadata {
  const seo = content.seo as Record<string, unknown> | undefined;
  if (!seo) return {};

  const metadata: Metadata = {};

  if (seo.metaTitle) {
    metadata.title = seo.metaTitle as string;
  }

  if (seo.metaDescription) {
    metadata.description = seo.metaDescription as string;
  }

  const noIndex = seo.noIndex as boolean | undefined;
  const noFollow = seo.noFollow as boolean | undefined;
  if (noIndex || noFollow) {
    metadata.robots = {
      index: !noIndex,
      follow: !noFollow,
    };
  }

  const ogImage = seo.openGraphImage as Record<string, unknown> | undefined;
  const ogImageUrl =
    (ogImage?.url as Record<string, unknown>)?.default as string | undefined ||
    (ogImage?.item as Record<string, unknown>)?.Url as string | undefined;

  if (ogImageUrl) {
    metadata.openGraph = { images: [ogImageUrl] };
  }

  return metadata;
}
