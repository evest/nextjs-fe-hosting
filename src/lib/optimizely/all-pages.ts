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
 * slug. The catch-all renders a 404 for it (tiny, harmless) and the rest
 * of the route falls back to ISR-only rendering.
 */
const PLACEHOLDER: { slug: string[] }[] = [
  { slug: ['__no-cms-pages-at-build__'] },
];

/**
 * Returns every published page's slug array, shaped for the catch-all route.
 *
 * Reads `_metadata.url.default` (per the official Optimizely ISR webhook
 * contract; see /diagnostics/cms-graph). On error or empty result, returns
 * a single placeholder slug to satisfy Cache Components while leaving real
 * URLs to ISR fallback.
 */
export async function getAllPagesPaths(): Promise<{ slug: string[] }[]> {
  try {
    const client = new GraphClient(process.env.OPTIMIZELY_GRAPH_SINGLE_KEY!, {
      graphUrl: getGraphGatewayUrl(),
    });
    const resp = await client.request(ALL_PAGES_QUERY, { pageType: PAGE_TYPES });
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
