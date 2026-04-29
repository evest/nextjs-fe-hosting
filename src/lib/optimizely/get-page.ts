import { GraphClient } from '@optimizely/cms-sdk';
import { cacheLife, cacheTag } from 'next/cache';
import { getGraphGatewayUrl } from '@/lib/config';
import { getPageTag } from '@/lib/cache/cache-keys';

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
 */
export async function getPageContent(slug: string[]) {
  'use cache';
  cacheLife('max');
  cacheTag(getPageTag(slug));

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
