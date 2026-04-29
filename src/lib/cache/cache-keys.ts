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
