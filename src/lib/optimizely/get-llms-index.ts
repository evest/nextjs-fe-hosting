import { getClient } from '@optimizely/cms-sdk';
import { cacheLife, cacheTag } from 'next/cache';
import { CACHE_KEYS } from '@/lib/cache/cache-keys';
import { routing } from '@/i18n/routing';

export type LlmsEntryType = 'article' | 'person' | 'landing';

/**
 * One row in the llms.txt / llms-full.txt index. The body field is present
 * for articles and people (richText Slate JSON) so the -full route can emit
 * the body in markdown; the slim /llms.txt drops it.
 */
export type LlmsEntry = {
  type: LlmsEntryType;
  locale: string;
  url: string;
  title: string;
  description: string | null;
  published: string | null;
  body: unknown | null;
};

type GraphSeo = {
  metaTitle?: string | null;
  metaDescription?: string | null;
  noIndex?: boolean | null;
};

type GraphMetadata = {
  url?: { default?: string | null } | null;
  locale?: string | null;
  published?: string | null;
  displayName?: string | null;
};

type ArticleItem = {
  heading?: string | null;
  ingress?: string | null;
  body?: { json?: unknown } | null;
  seo?: GraphSeo | null;
  _metadata?: GraphMetadata | null;
};

type PersonItem = {
  name?: string | null;
  title?: string | null;
  bio?: { json?: unknown } | null;
  seo?: GraphSeo | null;
  _metadata?: GraphMetadata | null;
};

type LandingItem = {
  seo?: GraphSeo | null;
  _metadata?: GraphMetadata | null;
};

const QUERY = `
  query LlmsIndex($locales: [Locales]) {
    ArticlePage(
      locale: $locales
      limit: 1000
      orderBy: { _metadata: { published: DESC } }
    ) {
      items {
        heading
        ingress
        body { json }
        seo { metaTitle metaDescription noIndex }
        _metadata { url { default } locale published displayName }
      }
    }
    PersonPage(locale: $locales, limit: 1000) {
      items {
        name
        title
        bio { json }
        seo { metaTitle metaDescription noIndex }
        _metadata { url { default } locale displayName }
      }
    }
    LandingPageExperience(locale: $locales, limit: 1000) {
      items {
        seo { metaTitle metaDescription noIndex }
        _metadata { url { default } locale displayName published }
      }
    }
  }
`;

function isUsable(meta: GraphMetadata | null | undefined, seo: GraphSeo | null | undefined): boolean {
  if (!meta?.url?.default || !meta.locale) return false;
  if (seo?.noIndex) return false;
  return true;
}

/**
 * Fetch every page that should appear in the LLM-facing indexes
 * (/llms.txt and /llms-full.txt), across every configured locale.
 *
 * Excludes pages where SeoBlock.noIndex is set — that flag is the single
 * "hide from discovery" signal for both search engines and LLM crawlers.
 *
 * Cached indefinitely in production with `cacheTag(LLMS_INDEX)`; the
 * /hooks/graph webhook revalidates that tag on every publish so the
 * index stays fresh. Local dev uses a short cache life since the webhook
 * can't reach localhost.
 */
export async function getLlmsIndex(): Promise<LlmsEntry[]> {
  'use cache';
  if (process.env.NODE_ENV === 'production') {
    cacheLife('max');
  } else {
    cacheLife('minutes');
  }
  cacheTag(CACHE_KEYS.LLMS_INDEX);

  try {
    const client = getClient();
    const data = (await client.request(QUERY, { locales: routing.locales })) as {
      ArticlePage?: { items?: ArticleItem[] | null } | null;
      PersonPage?: { items?: PersonItem[] | null } | null;
      LandingPageExperience?: { items?: LandingItem[] | null } | null;
    };

    const entries: LlmsEntry[] = [];

    for (const item of data.ArticlePage?.items ?? []) {
      if (!isUsable(item._metadata, item.seo)) continue;
      entries.push({
        type: 'article',
        locale: item._metadata!.locale!,
        url: item._metadata!.url!.default!,
        title: item.seo?.metaTitle ?? item.heading ?? item._metadata!.displayName ?? 'Untitled',
        description: item.seo?.metaDescription ?? item.ingress ?? null,
        published: item._metadata!.published ?? null,
        body: item.body?.json ?? null,
      });
    }

    for (const item of data.PersonPage?.items ?? []) {
      if (!isUsable(item._metadata, item.seo)) continue;
      entries.push({
        type: 'person',
        locale: item._metadata!.locale!,
        url: item._metadata!.url!.default!,
        title: item.seo?.metaTitle ?? item.name ?? item._metadata!.displayName ?? 'Untitled',
        description: item.seo?.metaDescription ?? item.title ?? null,
        published: null,
        body: item.bio?.json ?? null,
      });
    }

    for (const item of data.LandingPageExperience?.items ?? []) {
      if (!isUsable(item._metadata, item.seo)) continue;
      entries.push({
        type: 'landing',
        locale: item._metadata!.locale!,
        url: item._metadata!.url!.default!,
        title: item.seo?.metaTitle ?? item._metadata!.displayName ?? 'Untitled',
        description: item.seo?.metaDescription ?? null,
        published: item._metadata!.published ?? null,
        body: null,
      });
    }

    return entries;
  } catch (e) {
    console.error('[get-llms-index] graph query failed:', e);
    return [];
  }
}
