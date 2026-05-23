import { getClient } from '@optimizely/cms-sdk';
import { cacheLife, cacheTag } from 'next/cache';
import { CACHE_KEYS } from '@/lib/cache/cache-keys';
import { routing } from '@/i18n/routing';

export type ContentPath = {
  locale: string;
  url: string;
  published?: string | null;
};

const QUERY = `
  query AllContentPaths($locales: [Locales]) {
    _Content(locale: $locales, limit: 1000) {
      items {
        _metadata {
          url { default }
          locale
          published
          types
        }
      }
    }
  }
`;

// Content types that should never appear in the sitemap even if they have a
// public URL. SiteSettings is a singleton used only by JSON-LD / llms.txt.
const EXCLUDED_TYPES = new Set(['SiteSettings']);

/**
 * Fetch every published item with a usable URL across all locales, used
 * by the sitemap. Cached for an hour with cacheTag(PATHS); the
 * /hooks/graph webhook also revalidates that tag on every publish so the
 * sitemap stays fresh.
 *
 * Items are filtered down to those whose URL starts with one of the
 * configured locale prefixes — drops global components, fragments, etc.
 * that happen to have a URL set but aren't real pages.
 */
export async function getAllContentPaths(): Promise<ContentPath[]> {
  'use cache';
  cacheLife('hours');
  cacheTag(CACHE_KEYS.PATHS);

  try {
    const client = getClient();
    const data = (await client.request(QUERY, { locales: routing.locales })) as {
      _Content?: {
        items?: Array<{
          _metadata?: {
            url?: { default?: string | null } | null;
            locale?: string | null;
            published?: string | null;
            types?: (string | null)[] | null;
          } | null;
        }> | null;
      } | null;
    };
    const items = data._Content?.items ?? [];
    const localePrefixes = routing.locales.map((l) => `/${l}/`);

    return items
      .map((item): ContentPath | null => {
        const url = item._metadata?.url?.default;
        const locale = item._metadata?.locale;
        const types = item._metadata?.types ?? [];
        if (!url || !locale) return null;
        if (types.some((t) => t && EXCLUDED_TYPES.has(t))) return null;
        if (!localePrefixes.some((p) => url.startsWith(p)) && !routing.locales.some((l) => url === `/${l}`)) {
          return null;
        }
        return { locale, url, published: item._metadata?.published };
      })
      .filter((p): p is ContentPath => p !== null);
  } catch (e) {
    console.error('[all-content-paths] graph query failed:', e);
    return [];
  }
}
