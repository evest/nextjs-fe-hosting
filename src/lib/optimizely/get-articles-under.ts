import { getClient } from '@optimizely/cms-sdk';
import { cacheLife, cacheTag } from 'next/cache';
import { getArticlesUnderTag } from '@/lib/cache/cache-keys';
// Ensures config() has run before getClient() (see graph-config.ts).
import '@/lib/optimizely/graph-config';

/**
 * One article in the listing. The Graph response includes the metadata
 * (key, displayName, published) plus the article-specific fields we need
 * to render a card.
 */
export type ArticleListItem = {
  heading?: string | null;
  ingress?: string | null;
  featuredImage?: { url?: { default?: string | null } | null } | null;
  _metadata?: {
    key?: string | null;
    displayName?: string | null;
    published?: string | null;
    url?: { default?: string | null } | null;
  } | null;
};

const QUERY = `
  query ArticlesUnder($parent: String!, $locale: [Locales]) {
    ArticlePage(
      where: { _metadata: { url: { default: { startsWith: $parent } } } }
      orderBy: { _metadata: { published: DESC } }
      locale: $locale
    ) {
      items {
        heading
        ingress
        featuredImage {
          url { default }
        }
        _metadata {
          key
          displayName
          published
          url { default }
        }
      }
    }
  }
`;

/**
 * Fetch all ArticlePages whose URL starts with the given parent path,
 * newest first. The path is matched against `_metadata.url.default`, so
 * pass the parent's `url.default` exactly (typically locale-prefixed,
 * e.g. `/en/blog/`).
 *
 * Cached indefinitely with `'use cache'` + cacheTag(`opti-articles-under:<parent>:<locale>`).
 * The /hooks/graph webhook revalidates this tag for every parent-prefix
 * of a published ArticlePage URL, so the list stays fresh on publish.
 */
export async function getArticlesUnder(
  parentPath: string,
  locale: string,
): Promise<ArticleListItem[]> {
  'use cache';
  cacheLife('max');
  // Normalise to trailing slash so `/news` doesn't accidentally match `/newsletter`.
  const parent = parentPath.endsWith('/') ? parentPath : `${parentPath}/`;
  cacheTag(getArticlesUnderTag(parent, locale));

  try {
    const client = getClient();
    const data = (await client.request(QUERY, { parent, locale: [locale] })) as {
      ArticlePage?: { items?: ArticleListItem[] | null } | null;
    };
    // Defensive filter: don't include the parent page itself if it's an ArticlePage.
    return (data?.ArticlePage?.items ?? []).filter(
      (item) =>
        item._metadata?.url?.default !== parent &&
        item._metadata?.url?.default !== parentPath,
    );
  } catch (e) {
    console.error('[get-articles-under] graph query failed:', e);
    return [];
  }
}
