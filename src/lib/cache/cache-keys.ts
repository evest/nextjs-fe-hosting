/**
 * Central source of cache-tag values used with Next.js `cacheTag()` and
 * `revalidateTag()`. One callsite per logical key prevents typos that
 * would silently desync the cache from its invalidator.
 *
 * Tags are flat strings — Next.js does not impose structure, but we use
 * a `${baseKey}-${slug}` shape so the webhook can compose tags from
 * URL data without holding extra state.
 */

export const CACHE_KEYS = {
  PAGE: 'opti-page',
  PATHS: 'opti-paths',
  ARTICLES_UNDER: 'opti-articles-under',
  SITE_SETTINGS: 'opti-site-settings',
  LLMS_INDEX: 'opti-llms-index',
} as const;

export type CacheKey = (typeof CACHE_KEYS)[keyof typeof CACHE_KEYS];

/**
 * Build a tag for a specific page identified by its slug array
 * (e.g. ['en', 'about'] → 'opti-page:en/about').
 *
 * Uses ':' as the separator so the suffix can contain '/' without
 * encoding tricks. Empty slug → root.
 */
export function getPageTag(slug: string[]): string {
  const suffix = slug.length === 0 ? 'root' : slug.join('/');
  return `${CACHE_KEYS.PAGE}:${suffix}`;
}

/**
 * Build a tag for the article-listing cache scoped to a specific parent
 * path + locale (e.g. parent `/no/blogg/`, locale `no` →
 * `opti-articles-under:/no/blogg/:no`).
 *
 * The parent path is expected to be normalised with a trailing slash so
 * that `/news` doesn't collide with `/newsletter`. Tag composition
 * matches `getArticlesUnder` exactly so revalidation can target it.
 */
export function getArticlesUnderTag(parentPath: string, locale: string): string {
  const parent = parentPath.endsWith('/') ? parentPath : `${parentPath}/`;
  return `${CACHE_KEYS.ARTICLES_UNDER}:${parent}:${locale}`;
}

/**
 * Build a tag for the SiteSettings singleton at a given locale. The webhook
 * purges every locale variant by issuing one revalidateTag call per locale
 * when a SiteSettings publish event arrives.
 */
export function getSiteSettingsTag(locale: string): string {
  return `${CACHE_KEYS.SITE_SETTINGS}:${locale}`;
}
