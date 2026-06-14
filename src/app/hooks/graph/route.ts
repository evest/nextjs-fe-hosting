// Optimizely Graph webhook receiver.
//
// Verbatim port of the reference implementation from
// docs/isr-documentation.md §3.2. Authenticates the incoming request
// via the x-api-key header, resolves the published docId back to a URL
// path, calls revalidatePath() to invalidate the Next.js cache, and
// fires a CDN purge for the affected URL.
//
// Always returns 200 (with `received: true` or an `error` field) so
// Optimizely doesn't retry on transient downstream failures.

import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { purgeCdnCache } from "@/lib/cdn-cache";
import { CACHE_KEYS, getArticlesUnderTag, getPageTag, getSiteSettingsTag } from "@/lib/cache/cache-keys";
import { getAllContentPaths } from "@/lib/optimizely/all-content-paths";
import { routing } from "@/i18n/routing";

const CALLBACK_API_KEY = process.env.OPTIMIZELY_GRAPH_CALLBACK_APIKEY;
const singleKey = process.env.OPTIMIZELY_GRAPH_SINGLE_KEY!;
const gateway = (process.env.OPTIMIZELY_GRAPH_GATEWAY ?? "https://cg.optimizely.com").replace(/\/+$/, "");
const graphUrl = `${gateway}/content/v2`;

async function graphRequest(query: string, variables: Record<string, unknown>) {
  const res = await fetch(graphUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `epi-single ${singleKey}`,
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`GraphQL request failed (${res.status})`);
  const json = await res.json();
  return json.data;
}

// Sentinel returned by revalidateDocId for a SiteSettings publish: the POST
// handler reads it and purges the ENTIRE CDN (purgeCdnCache() with no args)
// instead of a single resolved path, because settings affect every page.
const SITE_SETTINGS_FULL_PURGE = "__full_purge__" as const;

/** Resolve the path for a specific docId and revalidate it. Returns the
 *  resolved path (without trailing slash) on success, "" if the doc
 *  cannot be resolved, or SITE_SETTINGS_FULL_PURGE for a SiteSettings
 *  publish (signals a whole-site CDN purge).
 *
 *  docId format: `{UUID}_{language}_Published` */
async function revalidateDocId(docId: string): Promise<string> {
  const parts = docId.split("_");
  const id = parts[0].replaceAll("-", "");
  const locale = parts[1];
  const response = await graphRequest(
    `
    query GetPath($id: String, $locale: Locales) {
      _Content(ids: [$id], locale: [$locale]) {
        item { _metadata { url { default } types } }
      }
    }
  `,
    { id, locale },
  );
  const meta = response?._Content?.item?._metadata;
  const types: string[] = meta?.types ?? [];

  // Always purge the LLM index — any page edit can change a title, ingress,
  // body, or the noIndex flag, all of which feed /llms.txt and
  // /llms-full.txt. Re-filling costs one Graph round-trip on the next request.
  revalidateTag(CACHE_KEYS.LLMS_INDEX, "max");

  // SiteSettings is a singleton fetched per locale and sits outside the URL
  // tree. On a SiteSettings publish, purge every locale's settings cache so
  // the next JSON-LD / llms.txt render picks up the new values.
  //
  // SiteSettings also drives the root layout (the Web Experimentation snippet
  // ID lives there), so a settings change affects EVERY page, not just the
  // pages that happen to fetch settings. revalidating the per-locale settings
  // tags alone would leave already-cached page shells serving the old snippet
  // state. So we additionally blow away every page tag and the layout, then
  // purge the whole CDN below — guaranteeing the new snippet state goes live
  // site-wide immediately. This is heavy but settings publishes are rare.
  const isSiteSettings = types.includes("SiteSettings");
  if (isSiteSettings) {
    for (const l of routing.locales) {
      revalidateTag(getSiteSettingsTag(l), "max");
    }
    // Drops the prerendered shell for the entire app (root layout included),
    // so the next request to any path re-renders with the current snippet ID.
    revalidatePath("/", "layout");
    return SITE_SETTINGS_FULL_PURGE;
  }

  const url = meta?.url?.default;
  if (!url) return "";
  const path = url.endsWith("/") ? url.slice(0, -1) : url;
  revalidatePath(path || "/");

  const segments = path.split("/").filter(Boolean);

  // Invalidate the per-page cache tag. getPageContent() and the PersonElement
  // person lookup both tag their 'use cache' entries with getPageTag(); a
  // PersonElement embedded in another page is only reachable via this tag,
  // not via revalidatePath() of the person's own route.
  revalidateTag(getPageTag(segments), "max");

  // Also invalidate any ArticleListBlock caches that include this URL as a
  // descendant. For `/no/blog/my-post`, candidate parents are `/no/` and
  // `/no/blog/`. revalidateTag on an unwritten tag is a no-op, so
  // over-invalidating costs nothing while keeping listings fresh on publish.
  for (let i = 1; i < segments.length; i++) {
    const parent = `/${segments.slice(0, i).join("/")}/`;
    // 'max' matches the cacheLife profile inside getArticlesUnder so the
    // re-filled cache entry behaves the same as before invalidation.
    revalidateTag(getArticlesUnderTag(parent, locale), "max");
  }

  // Sitemap is cached for an hour and tagged with PATHS — any publish should
  // re-fill it with the new page included. 'hours' matches the cacheLife
  // profile inside getAllContentPaths.
  revalidateTag(CACHE_KEYS.PATHS, "hours");

  return path || "/";
}

export async function POST(request: NextRequest) {
  const apiKey = request.headers.get("x-api-key");
  if (!CALLBACK_API_KEY || apiKey !== CALLBACK_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const payload = await request.json();
  const { subject, action } = payload.type;
  if (subject === "doc" && (action === "updated" || action === "expired")) {
    const path = await revalidateDocId(payload.data.docId);
    if (path === SITE_SETTINGS_FULL_PURGE) {
      // SiteSettings changed → purge the whole CDN. The edge-cache purge API
      // takes exact URLs (no wildcard), so enumerate every public path and
      // purge them all, plus the locale roots and "/". revalidatePath('/',
      // 'layout') (done above) already cleared the Next.js cache for every
      // route; this clears the matching edge entries so visitors don't keep
      // getting the old snippet state from the CDN.
      const hostname = process.env.OPTIMIZELY_SITE_HOSTNAME?.replace(/^https?:\/\//, "");
      if (hostname) {
        void (async () => {
          try {
            const base = `https://${hostname}`;
            const paths = await getAllContentPaths();
            // Dedupe: content URLs + every locale root + the bare root.
            const urls = new Set<string>([`${base}/`]);
            for (const l of routing.locales) urls.add(`${base}/${l}`);
            for (const p of paths) {
              urls.add(`${base}${p.url.endsWith("/") ? p.url.slice(0, -1) || "/" : p.url}`);
            }
            await purgeCdnCache([...urls]);
          } catch (err) {
            console.error(
              "[hooks] CDN full purge failed:",
              err instanceof Error ? err.message : err,
            );
          }
        })();
      }
    } else if (path) {
      // Replace this with the public-facing hostname which should have its
      // cache purged. The cache purge endpoint takes an array and multiple
      // domains/paths can be purged.
      const hostname = process.env.OPTIMIZELY_SITE_HOSTNAME?.replace(/^https?:\/\//, "");
      if (hostname) {
        purgeCdnCache([`https://${hostname}${path}`]).catch((err) =>
          console.error("[hooks] CDN cache purge failed:", err.message),
        );
      }
    }
  }
  return NextResponse.json({ received: true });
}
