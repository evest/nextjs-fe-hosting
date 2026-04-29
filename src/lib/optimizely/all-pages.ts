/**
 * Cache Components forbids generateStaticParams returning []: it requires
 * at least one entry so the framework can validate the route at build time.
 * We satisfy that rule with a single placeholder slug that getPageContent
 * recognises and short-circuits without a Graph call.
 *
 * Why we deliberately don't pre-render real pages at build:
 *   - The DXP build container has unreliable outbound connectivity to
 *     Optimizely Graph. We've seen HeadersTimeoutError / 50s 'use cache'
 *     fill timeouts on individual real pages during Test2 builds.
 *   - A timed-out Graph fetch inside 'use cache' fails the build and is
 *     unrecoverable; the alternative — recording a null result and 404'ing
 *     the page — silently breaks real published pages until the next
 *     deploy or webhook event.
 *   - Pages are perfectly cacheable at runtime via the shared Redis cache
 *     handler. First request per URL pays Graph latency for TTFB; every
 *     subsequent request across all replicas is a cache HIT. The
 *     /hooks/graph webhook invalidates per-page on publish.
 *
 * Net effect: build never depends on Graph. Cache fills happen on first
 * request per URL after deploy.
 */
export const PLACEHOLDER_SLUG_SEGMENT = '__no-cms-pages-at-build__';

const PLACEHOLDER: { slug: string[] }[] = [
  { slug: [PLACEHOLDER_SLUG_SEGMENT] },
];

export function getAllPagesPaths(): { slug: string[] }[] {
  return PLACEHOLDER;
}
