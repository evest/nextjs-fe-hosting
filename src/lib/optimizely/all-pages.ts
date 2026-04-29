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
 * Returns every published page's slug array, shaped for the catch-all route.
 *
 * Reads `_metadata.url.default` (per the official Optimizely ISR webhook
 * contract; see /diagnostics/cms-graph). Returns [] on any error so a
 * transient Graph outage during `next build` falls back to ISR-only
 * rendering rather than failing the build.
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
    return out;
  } catch (e) {
    console.error('[all-pages] graph query failed, falling back to ISR-only:', e);
    return [];
  }
}
