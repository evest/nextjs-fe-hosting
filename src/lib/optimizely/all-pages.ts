import { GraphClient } from '@optimizely/cms-sdk';
import { getGraphGatewayUrl } from '@/lib/config';

/**
 * Page-shaped content types that should be pre-rendered at build via
 * generateStaticParams. Must match the `key` values registered in
 * src/content-types/*.ts. Adding a new _page or _experience type here
 * enables it to be statically generated; omission causes ISR-only
 * rendering on first request.
 */
const PAGE_TYPES = ['ArticlePage', 'PersonPage', 'LandingPageExperience'];

const ALL_PAGES_QUERY = `
  query AllPages($pageType: [String]) {
    _Content(where: { _metadata: { types: { in: $pageType } } }) {
      items {
        _metadata {
          url { default hierarchical type }
        }
      }
    }
  }
`;

type GraphContentItem = {
  _metadata?: {
    url?: {
      default?: string | null;
      hierarchical?: string | null;
      type?: string | null;
    };
  };
};

/**
 * Cache Components forbids generateStaticParams returning []: it requires
 * at least one entry so the framework can validate the route at build time.
 * When Graph is unreachable or has no pages of the configured types we
 * still need to return something, so we use a deliberately-unmatchable
 * slug. getPageContent recognises this slug and short-circuits without
 * calling Graph — important because the DXP build container can't always
 * reach Graph, and a Graph fetch from inside `'use cache'` would manifest
 * as USE_CACHE_TIMEOUT and fail the build.
 */
export const PLACEHOLDER_SLUG_SEGMENT = '__no-cms-pages-at-build__';
const PLACEHOLDER: { slug: string[] }[] = [
  { slug: [PLACEHOLDER_SLUG_SEGMENT] },
];

/**
 * Returns every published page's slug array, shaped for the catch-all route.
 *
 * Reads `_metadata.url.default` (per the official Optimizely ISR webhook
 * contract; see /diagnostics/cms-graph). On error or empty result, returns
 * a single placeholder slug to satisfy Cache Components while leaving real
 * URLs to ISR fallback.
 *
 * Race the Graph call against a 30s timeout so a slow Graph response
 * during DXP build doesn't hang the build worker indefinitely. If the
 * race times out we fall through to the placeholder and rely on ISR.
 */
const BUILD_TIMEOUT_MS = 30_000;

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timeout after ${ms}ms`)), ms),
    ),
  ]);
}

export async function getAllPagesPaths(): Promise<{ slug: string[] }[]> {
  try {
    const client = new GraphClient(process.env.OPTIMIZELY_GRAPH_SINGLE_KEY!, {
      graphUrl: getGraphGatewayUrl(),
    });
    const resp = await withTimeout(
      client.request(ALL_PAGES_QUERY, { pageType: PAGE_TYPES }),
      BUILD_TIMEOUT_MS,
      'getAllPagesPaths',
    );
    const items: GraphContentItem[] = resp?._Content?.items ?? [];
    const seen = new Set<string>();
    const out: { slug: string[] }[] = [];
    for (const item of items) {
      const url = item?._metadata?.url?.default;
      if (!url) continue;
      const parts = url.split('/').filter(Boolean);
      const key = parts.join('/');
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ slug: parts });
    }
    if (out.length === 0) {
      console.warn('[all-pages] Graph returned no pages, using placeholder');
      return PLACEHOLDER;
    }
    return out;
  } catch (e) {
    console.error('[all-pages] graph query failed, using placeholder:', e);
    return PLACEHOLDER;
  }
}
