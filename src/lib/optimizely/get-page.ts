import { GraphClient } from '@optimizely/cms-sdk';
import { cacheLife, cacheTag } from 'next/cache';
import { getGraphGatewayUrl } from '@/lib/config';
import { getPageTag } from '@/lib/cache/cache-keys';
import { PLACEHOLDER_SLUG_SEGMENT } from '@/lib/optimizely/all-pages';

/**
 * Fetch a CMS page by slug, cached indefinitely and tagged for on-demand
 * revalidation by the Optimizely Graph webhook.
 *
 * The cache key is the slug array (Next.js memoizes by argument identity),
 * and the tag is shared with the webhook receiver so a publish event can
 * invalidate exactly this page.
 *
 * Returns null when no content matches the path. Errors are swallowed
 * (returns null) so a transient Graph outage doesn't surface as a
 * HANGING_PROMISE_REJECTION during prerender — the caller decides whether
 * to render notFound() or something else.
 *
 * Special case: the placeholder slug used by getAllPagesPaths to satisfy
 * Cache Components' "must return ≥1 entry" rule short-circuits without
 * a Graph call. This keeps `next build` fast and reliable even when the
 * DXP build container can't reach Graph.
 */
export async function getPageContent(slug: string[]) {
  'use cache';
  cacheLife('max');
  cacheTag(getPageTag(slug));

  if (slug.length === 1 && slug[0] === PLACEHOLDER_SLUG_SEGMENT) {
    return null;
  }

  try {
    const client = new GraphClient(process.env.OPTIMIZELY_GRAPH_SINGLE_KEY!, {
      graphUrl: getGraphGatewayUrl(),
    });
    const path = `/${slug.join('/')}/`;
    const items = await client.getContentByPath(path);
    return items?.[0] ?? null;
  } catch (e) {
    console.error('[get-page] graph lookup failed:', e);
    return null;
  }
}
