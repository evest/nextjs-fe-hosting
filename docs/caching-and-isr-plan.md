# Caching, ISR & Performance — Implementation Plan

> Goal: Take this Optimizely SaaS CMS Next.js app from a working but unoptimised
> baseline to a production-ready, SEO-strong, ISR-driven setup. The single hard
> constraint is that `@optimizely/cms-sdk` must remain the data source.
> Everything else — runtime config, route layout, caching strategy, middleware
> — is in scope.
>
> Source material reviewed:
> - This repo (Next.js 16.1.1, React 19.2.3, App Router, `@optimizely/cms-sdk@^1.0.0`)
> - Optimizely's "Next.js ISR Caching and Optimizely Graph webhooks" guide
>   (https://docs.developers.optimizely.com/digital-experience-platform/docs/nextjs-isr-caching-and-optimizely-graph-webhooks)
> - Local skills: `optimizely-cms-nextjs`, `nextjs-app-router-patterns`,
>   `optimizely-frontend-hosting`
> - Existing `/diagnostics` suite in `src/app/diagnostics/`

---

## 0. Executive Summary — what changes, in one paragraph

The current app uses no caching at all on the CMS path: every request to `/[...slug]` and `/preview` calls `GraphClient.getContentByPath` directly with no `'use cache'`, no `cacheTag`, no `revalidate`, and no `generateStaticParams`. There is no webhook endpoint, so when an editor publishes content the site has no way to know. We will (1) turn on `cacheComponents: true`, (2) wrap every CMS read in `'use cache'` + `cacheLife('max')` + a tagging scheme, (3) pre-render every CMS page at build via `generateStaticParams` driven by a Graph query for all paths, (4) wire Optimizely DXP's **shared Redis cache handler** (`cache-handler.mjs` + `cacheHandler:` in `next.config.ts`) so revalidation reaches every replica, (5) implement Optimizely's webhook contract at **`/hooks/graph`** with `x-api-key` auth, (6) register the webhook programmatically at startup via `instrumentation.ts` against `{gateway}/api/webhooks`, (7) keep `/preview` fully dynamic and uncached (editor-only route — freshness over performance, no Suspense), and (8) add real `Metadata`, OG image, robots, and sitemap output to lock in SEO. The webhook also calls Optimizely's Cloud Platform Services CDN purge API so Cloudflare's edge invalidates in lockstep with the Next.js cache.

---

## 1. Should you use `<Suspense>`?

**Mostly no — sparingly, where it actually earns its keep.** With `cacheComponents: true`, any uncached server-side data access in a page must be wrapped in `<Suspense>` or the whole page opts out of partial prerendering. The win — when there is one — is that a static shell ships from the CDN immediately and slow per-request work streams in afterwards.

Two routes, two different rules:

- **Public CMS pages (`/[...slug]`)** — don't suspend. Cache the data fetch with `'use cache'` and the whole page becomes static. There is no "dynamic island" here; the entire tree is CMS content, and we want every byte of it cached.

- **`/preview`** — don't suspend. **Editor-only route. Performance does not matter; correctness and freshness do.** Every part of a preview page can change based on the editor's last edit, so there is no meaningful static shell to split out. Suspense would only add a render boundary that complicates the communication-injector wiring without making editors' lives any better. Keep `/preview` fully dynamic, never cached, no Suspense — exactly the pattern it has today, just verified to still hold under `cacheComponents: true`.

Where Suspense **is** worth it (none of these exist today, but flagging for future work):

- A genuinely slow third-party call on a public page (recommendations widget, live stock counter) where the rest of the page is cacheable but that one block isn't.
- A user-personalised badge in an otherwise-static layout (e.g. "Welcome, $name") fed by `cookies()`/`headers()`.

Concrete rule of thumb: **if the data is from the CMS via Graph on a public page, cache it. If it's per-user or live data on a public page, suspend it. On `/preview`, neither — just render dynamically.**

---

## 2. Current-State Audit (what exists now)

### 2.1 Hosting / runtime
- Next.js **16.1.1** (latest), React **19.2.3**, Node `>=18.18.0` (engines pin).
- `cacheComponents: false` — `'use cache'` directive disabled. (next.config.ts:4-14)
- No remote cache handler; in-memory per-replica only.
- Deployed to Optimizely Frontend Hosting (Cloudflare CDN → Azure container origin, single region).

### 2.2 Routes
| Route | File | Caching today |
|---|---|---|
| `/` | `src/app/page.tsx` | Static placeholder, 307-redirects to `/en` via `next.config.ts` |
| `/[...slug]` | `src/app/[...slug]/page.tsx` | **No caching, no static params, no revalidate, no metadata caching.** Calls `GraphClient.getContentByPath` per request. |
| `/preview` | `src/app/preview/page.tsx` | Uncached (correct). Retries on `No content found for key` up to 3× with 200ms delay. |
| `/debug` | `src/app/debug/route.ts` | Returns env vars (masked). Should be gated in prod. |
| `/diagnostics/*` | `src/app/diagnostics/**` | The probing suite — keep as is, gate before public deploy. |

### 2.3 Catch-all CMS page (`src/app/[...slug]/page.tsx`) — issues

```ts
async function getContent(slug: string[]) {
  const client = getClient();
  const content = await client.getContentByPath(`/${slug.join('/')}/`);
  return content?.[0] ?? null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const content = await getContent(slug);   // ← duplicate fetch
  …
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const content = await getContent(slug);   // ← second fetch
  …
}
```

Problems:
1. `generateMetadata` and the page render call `getContent` independently → **2× Graph queries per request**. React's `cache()` would deduplicate within a request; `'use cache'` would deduplicate across requests.
2. No `generateStaticParams` → every CMS page is rendered on demand at runtime.
3. No `revalidate`, no `cacheTag` → no path for editor publishes to invalidate.
4. No `notFound()` cache strategy → 404s re-query Graph every time a bot crawls a missing URL.

### 2.4 Layout chain
- Root layout (`src/app/layout.tsx`) imports Geist fonts, mounts hard-coded `<Header>` (client component) and `<Footer>` (server, with module-level `new Date().getFullYear()`).
- Header has hard-coded menu items (`menuItems` const) — not from CMS.
- Footer same — hard-coded sections + `process.env.OPTIMIZELY_CMS_URL` Edit link.
- No `metadataBase`, no template title pattern, no default OG image, no robots default.

### 2.5 SEO
- `src/lib/seo.ts` reads `seo` block from content if present. Decent baseline; no defaults.
- No `app/sitemap.ts`, no `app/robots.ts`, no canonical URL handling, no hreflang/alternates.

### 2.6 Webhook / revalidation
- **None.** No `/api/revalidate` route. The `/api/diagnostics/revalidate` route is for the diagnostics suite only.
- No webhook secret env var.
- No CMS-side webhook configured (assumption — verify on the CMS instance).

### 2.7 Middleware (`src/proxy.ts`)
- Scoped to `/diagnostics/*` and `/api/diagnostics/*` only — sets debug headers.
- **No locale negotiation.** Currently the only thing that gets you to `/en` is the `next.config.ts` redirect from `/`. Hardcoded paths inside Header (`/en/products`, …) are how non-`/en` locales would even surface today.

### 2.8 Diagnostics suite
- 16 tests, well-instrumented, intentionally unauthenticated (warned in the index page footer).
- `/diagnostics/isr` uses `export const revalidate = 30` — proves time-based ISR works.
- `/diagnostics/on-demand` uses `unstable_cache` + `revalidateTag` — proves on-demand works on a single replica (caveat: cache handler is in-memory, so multi-replica needs Redis).
- `/diagnostics/use-cache` explicitly uses the **legacy** `unstable_cache` because `cacheComponents` is off.

### 2.9 Optimizely SDK
The installed `@optimizely/cms-sdk@^1.0.0` exposes:
- `GraphClient`: `getContentByPath`, `getPath`, `getItems`, `getPreviewContent`, raw `request`.
- `getPreviewUtils`, `OptimizelyComponent`, `OptimizelyComposition`, `OptimizelyGridSection`, `damAssets`.

**There is no built-in `getAllPagesPaths()` — we have to write one** using `client.request()` against `_Content` (see Task 4.1).

---

## 3. Target Architecture

```
                     ┌────────────────────────────────────────┐
                     │  Optimizely SaaS CMS (Editor)          │
                     │      ↓ publish                          │
                     │  Optimizely Graph                      │
                     └───────────┬────────────────────────────┘
                                 │ webhook (topic *.*, status: Published)
                                 │ POST /hooks/graph  +  x-api-key
                                 ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ Cloudflare CDN (Optimizely Frontend Hosting)                             │
│                                                                          │
│  GET /en/about      ─────►  cached HTML hit                              │
│                                                                          │
│  POST /hooks/graph ────►   ┌───────────────────────────────────────┐    │
│                            │ Next.js container[s] (Azure region)   │    │
│                            │                                       │    │
│  GET /preview     ────────►│  /preview         — uncached, suspend │    │
│                            │  /[...slug]       — 'use cache' max   │    │
│  GET /en/about    cache    │  /hooks/graph     — verify + revalidate│   │
│  miss → ─────────────────► │  /sitemap.xml     — 'use cache' 1h    │    │
│                            │                                       │    │
│                            │     │   ▲                             │    │
│                            │     │   │   cache-handler.mjs         │    │
│                            │     ▼   │                             │    │
│                            └─────┼───┼─────────────────────────────┘    │
│                                  │   │                                  │
│                                  ▼   │  (Azure Managed Identity, TLS)   │
│                            ┌──────────────────────────────────────┐     │
│                            │ Azure Managed Redis (provisioned by  │     │
│                            │ DXP, shared across replicas)         │     │
│                            │ key prefix: nextjs:{DEPLOYMENT_ID}:  │     │
│                            └──────────────────────────────────────┘     │
│                                                                          │
│   ── /hooks/graph also calls Cloud Platform Services edge-cache/purge ──│
│      (Bearer token via Azure Managed Identity) → Cloudflare invalidates │
└──────────────────────────────────────────────────────────────────────────┘
```

Rendering modes per route:
- `/[...slug]/*` — **SSG at build + ISR via on-demand revalidation.** Revalidate trigger = webhook, not TTL.
- `/preview` — **dynamic, never cached.** Wrapped in `<Suspense>`.
- `/hooks/graph` — **dynamic POST.** Validates `x-api-key`, resolves docId → URL via Graph, calls `revalidatePath` and the CDN purge API.
- `/sitemap.xml`, `/robots.txt` — generated. Sitemap cached with same Graph query as `generateStaticParams`.
- `/[locale]/page.tsx` (homepage) — pre-rendered per locale.

Cache key convention:
```ts
// src/lib/cache/cache-keys.ts
export const CACHE_KEYS = {
  PAGE: 'opti-page',          // tagged per content guid
  HEADER: 'opti-header',      // optional: if Header becomes CMS-driven
  FOOTER: 'opti-footer',      // optional: same
  PATHS: 'opti-paths',        // sitemap / generateStaticParams source
} as const;

export function getCacheTag(key: string, locale: string, suffix?: string): string {
  return suffix ? `${key}-${locale}-${suffix}` : `${key}-${locale}`;
}
```

> **Why `/hooks/graph` and not `/api/revalidate`?** Because that's the path Optimizely's DXP cache-handler reference implementation uses, and it's the one all of Optimizely's docs assume. There is no functional reason it couldn't be `/api/revalidate` (and other Optimizely starters use that name), but matching the official docs makes operations and troubleshooting one-step. The middleware matcher in `proxy.ts` already excludes both prefixes, so no rewrite trap.

---

## 4. Implementation Plan

### Phase 0 — Pre-flight (do not skip)

#### 0.1 Confirm production is multi-replica (already known: yes)
Production on Optimizely DXP runs multiple Next.js container replicas behind the load balancer. This is exactly the scenario the new Optimizely-provided Redis cache handler solves — we use it. Phase 3 covers wiring it.

Local-dev quick check still worth running once: hit `/diagnostics/runtime` ~10× — `PROCESS_ID` flipping confirms the load balancer is rotating replicas. If you only ever see one PROCESS_ID locally that's expected (single `next dev`); you'll see the rotation in Test2 / Production.

#### 0.2 Snapshot a baseline Lighthouse report
Run Lighthouse against `/en` and one CMS-backed page **before** any changes. Save the JSON report under `docs/perf/baseline-YYYY-MM-DD.json`. Without a baseline you can't prove any improvement.

```bash
npx lighthouse https://<host>/en --output=json --output-path=./docs/perf/baseline-en.json --only-categories=performance,seo,accessibility
```

#### 0.3 Verify `url.default` is populated on this CMS instance
The official `/hooks/graph` (Phase 3.4) reads **`_metadata.url.default`** to resolve `docId → URL`. If `url.default` is `null` for a published item, the webhook will silently no-op for that page — content updates won't appear on the site even though the hook returned 200. This was the failure mode that bit earlier drafts of this plan (which read `url.hierarchical` to work around it).

Open [`/diagnostics/cms-graph`](../src/app/diagnostics/cms-graph/page.tsx) — it runs a query against this CMS instance and reports `_metadata.url`. Pass condition for *this* phase is simply: `url.default` is non-null on the probe page.

If `url.default` is null:
- Check the CMS Settings → Sites for that page's URL configuration.
- Confirm the page is in the *Published* state (not Draft).
- If the entire instance reports `url.default: null` consistently, fall back to the hierarchical-stripping pattern (kept in version control history of this file). Don't paper over it with `url.hierarchical` ad-hoc — the difference will surface as flaky publish events later.

The probe is also the first CMS-backed test in the diagnostics suite. Keep it — re-running after any CMS-side routing or Site config change catches breaks immediately rather than via editor reports.

#### 0.4 Confirm DXP-side environment provisioning
The cache handler depends on environment variables that DXP sets automatically when the deployment is configured for ISR. Before starting, confirm with your DXP admin (or via `/debug` once added to the allowlist) that these are present in the Test/Production environments:

- `REDIS_URL` — host:port of the Azure Managed Redis instance
- `OPTIMIZELY_DXP_DEPLOYMENT_ID` — namespace prefix
- `AZURE_CLIENT_ID` — managed-identity client ID (for Redis + CDN purge auth)
- `OPTIMIZELY_CLOUDPLATFORM_API_URL` — base URL of the Cloud Platform Services edge-cache API
- `OPTIMIZELY_CLOUDPLATFORM_API_RESOURCE_ID` — resource ID for the managed-identity token scope

If any of these are missing on Test2, the deploy will run but Redis falls back to in-memory (silent multi-replica desync) and CDN purge will 401 (silent stale CDN). File a ticket to get them set before going live.

---

### Phase 1 — Foundation: enable `cacheComponents`, wire Suspense

**Why first:** unlocks `'use cache'`, PPR, and `cacheLife`. Everything else builds on it.

#### 1.1 Flip the flag
- File: `next.config.ts`
- Change: `cacheComponents: true` (remove the long comment block; replace with a one-line "// 'use cache' / PPR enabled" comment).

#### 1.2 Verify `/preview` stays dynamic and uncached
- File: `src/app/preview/page.tsx`
- **Do not refactor.** `/preview` is editor-only and must reflect the latest CMS state on every request — performance is not a concern, freshness is. Keep the existing structure: `getPreviewContent` called inline, no `'use cache'`, no `<Suspense>`.
- Add `export const dynamic = 'force-dynamic'` and `export const revalidate = 0` to make the contract explicit. Under `cacheComponents: true`, this is what tells Next.js "render fresh, never cache, regardless of any defaults the layout introduces."
- Sanity check after enabling `cacheComponents`: build, then load `/preview?...` in the CMS preview frame and confirm content updates immediately when the editor edits a property. If it doesn't, something above this route (likely the root layout) inadvertently picked up cache semantics — investigate before moving on.
- Keep the existing 3× retry loop on `No content found for key` — it's defending against a real timing race between Graph indexing and CMS preview loading the iframe.

#### 1.3 Refactor `/[...slug]` so the data fetch is one cached function
- File: `src/app/[...slug]/page.tsx`
- Extract `getPageContent(slug, locale?)` into `src/lib/optimizely/get-page.ts` with `'use cache'` + `cacheLife('max')` + `cacheTag(...)`.
- Have both `generateMetadata` and the page itself call `getPageContent(slug)`. Same input → same cache key → one Graph round-trip.
- Add `notFound()` branch when result is empty.

```ts
// src/lib/optimizely/get-page.ts
import { GraphClient } from '@optimizely/cms-sdk';
import { cacheLife, cacheTag } from 'next/cache';
import { getGraphGatewayUrl } from '@/lib/config';
import { CACHE_KEYS, getCacheTag } from '@/lib/cache/cache-keys';

export async function getPageContent(slug: string[], locale: string) {
  'use cache';
  cacheLife('max');
  cacheTag(getCacheTag(CACHE_KEYS.PAGE, locale, slug.join('/') || 'root'));

  try {
    const client = new GraphClient(process.env.OPTIMIZELY_GRAPH_SINGLE_KEY!, {
      graphUrl: getGraphGatewayUrl(),
    });
    const path = `/${[locale, ...slug].filter(Boolean).join('/')}/`;
    const items = await client.getContentByPath(path);
    return items?.[0] ?? null;
  } catch {
    return null;
  }
}
```

The `'use cache'` rules:
- **Must be the literal first statement** of the function body.
- **Inputs must be primitives** (slug is `string[]` — fine, it serializes deterministically).
- **Never return a secret** from the cached function — the result is shared across all callers.
- **Don't read** `headers()`, `cookies()`, `draftMode()`, `Math.random()`, `Date.now()` inside.

---

### Phase 2 — Pre-render every CMS page at build (`generateStaticParams`)

#### 2.1 Write `getAllPagesPaths`
- New file: `src/lib/optimizely/all-pages.ts`
- Run a raw Graph query for every page-typed item, return `{ slug }[]` shaped for the `[...slug]` route.

```ts
import { GraphClient } from '@optimizely/cms-sdk';
import { getGraphGatewayUrl } from '@/lib/config';

const ALL_PAGES_QUERY = `
  query AllPages($pageType: [String]) {
    _Content(where: { _metadata: { types: { in: $pageType } } }) {
      items {
        _metadata {
          displayName
          locale
          url { hierarchical default type }
        }
      }
    }
  }
`;

const PAGE_TYPES = ['ArticlePage', 'PersonPage', 'LandingPageExperience'];

export async function getAllPagesPaths(): Promise<{ slug: string[] }[]> {
  try {
    const client = new GraphClient(process.env.OPTIMIZELY_GRAPH_SINGLE_KEY!, {
      graphUrl: getGraphGatewayUrl(),
    });
    const resp = await client.request(ALL_PAGES_QUERY, { pageType: PAGE_TYPES } as any);
    const items = resp?._Content?.items ?? [];
    const seen = new Set<string>();
    const out: { slug: string[] }[] = [];
    for (const item of items) {
      const url: string | undefined = item?._metadata?.url?.default;
      if (!url) continue;
      const parts = url.split('/').filter(Boolean);
      const key = parts.join('/');
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ slug: parts });
    }
    return out;
  } catch (e) {
    console.error('[all-pages] failed:', e);
    return [];   // empty = pure ISR fallback; build still succeeds
  }
}
```

The list of page types (`PAGE_TYPES`) must stay in sync with the registered content types. Open question: should this be auto-derived from `src/content-types/index.ts` by filtering on `baseType === '_page'`? Worth a small helper if the project grows.

#### 2.2 Wire it into the route
- File: `src/app/[...slug]/page.tsx`

```ts
export async function generateStaticParams() {
  return getAllPagesPaths();
}
```

The catch-all already accepts `slug: string[]`. With `cacheLife('max')` on the data fetch, build-time SSG and runtime ISR share the same cache.

#### 2.3 Decide on locale handling
The `getAllPagesPaths` Graph query returns paths that already include the locale prefix (e.g. `/en/about/`). The simplest play: keep paths whole and let `[...slug]` match them as-is (slug = `['en', 'about']`). The `proxy.ts` middleware does no locale rewrites today, so URLs stay literal.

Alternative: introduce `app/[locale]/[...slug]/page.tsx` and a real locale middleware. **Recommendation: defer this until you actually need multi-locale routing.** The current setup with `/` → `/en` redirect is fine for English-only.

If/when you need it, the plan is in `optimizely-cms-nextjs/references/locale-routing.md`.

---

### Phase 3 — Optimizely DXP cache handler + Graph webhook

This is the headline phase: shared Redis cache + on-demand revalidation + CDN purge, all per Optimizely's official ISR pattern. Three components must land together:

1. `cache-handler.mjs` (Phase 3.1) — shared cache backend.
2. `/hooks/graph` (Phase 3.4) — the receiver Optimizely calls when content publishes.
3. `instrumentation.ts` (Phase 3.5) — programmatically registers the webhook with Graph at startup so it survives slot rotations.

#### 3.1 Add the cache handler

New file at repo root: **`cache-handler.mjs`** (must be `.mjs`, not `.ts` — Next.js loads it before the TS pipeline boots).

Use Optimizely's published reference implementation verbatim from [docs/isr-documentation.md](./isr-documentation.md) §2.2. Don't hand-roll one — the auth, cluster connection, token refresh, and reconnect cooldown are all subtle and the reference handles them correctly.

Key design points to be aware of when reviewing the file:

- **Redis Cluster, not single-node.** Uses `createCluster` from the `redis` package, with `nodeAddressMap` to handle the case where Azure announces internal IPs back to the client.
- **Authentication via `@redis/entraid`.** Uses `EntraIdCredentialsProviderFactory.createForDefaultAzureCredential(...)` with a `ManagedIdentityCredential({ clientId: AZURE_CLIENT_ID })`. The provider rotates tokens automatically (`expirationRefreshRatio: 0.8`) — do **not** reduce this to a one-shot token; long-running containers will silently fail Redis ops once the initial token expires.
- **TLS required** (`rediss://`).
- **10-second connect timeout** plus a **60-second cooldown** (`connectionFailedUntil`) after a failed attempt. Without the cooldown, every cache op during a Redis outage would trigger a fresh reconnect attempt.
- **`withFallback` wrapper** around every Redis op — any thrown error returns `null` and the handler routes the op to the in-memory `Map` instead. This is what keeps the site up during a Redis outage.
- **Key prefix `nextjs:${OPTIMIZELY_DXP_DEPLOYMENT_ID}:`** so blue/green slots can share the same Redis without colliding.
- **`revalidateTag` is path-derived, not SCAN-based.** When Next.js calls `revalidatePath('/foo')`, it emits the tag `_N_T_/foo`. The handler reverses this: `_N_T_/foo → ${PREFIX}/foo`, then `DEL`. The `_N_T_/layout` tag (sent as a side-effect on every call) is filtered out — obeying it would purge every page. **No Redis SCAN is used.** Earlier drafts of this plan suggested SCAN; that was wrong.
- **`resetRequestCache()`** is implemented as an explicit no-op. Required by the Next.js handler interface; omitting it is a forward-compat hazard.

Add the dependencies:
```bash
npm install redis @redis/entraid @azure/identity
```

Note: the official handler in §2.2 uses `any`-typed parameters and `console.log` extensively — don't ESLint-clean it. Keeping it byte-for-byte identical to Optimizely's reference makes future doc updates trivially mergeable. Add an ESLint disable comment at the top if needed.

#### 3.2 Wire the handler in `next.config.ts`

```ts
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { NextConfig } from 'next';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

const nextConfig: NextConfig = {
  cacheHandler: resolve(__dirname, 'cache-handler.mjs'),
  cacheMaxMemorySize: 0,           // disable Next's in-process LRU; the handler is authoritative
  cacheComponents: true,           // unlocks 'use cache' (Phase 1)
  // ... existing image config, headers, redirects
};

export default nextConfig;
```

> `next.config.ts` is currently a TS file; the handler module is `.mjs`. That's fine — Next.js loads the handler at runtime, not via the TS compiler. Don't try to write a TS handler; Next.js's docs explicitly require `.js`/`.mjs` for the cache-handler entry point.

Note `cacheMaxMemorySize: 0`: this tells Next.js not to keep its own duplicate LRU in front of the handler. With the handler in place, the Redis store is the single source of truth across all replicas; an in-process LRU would re-introduce the desync we're trying to eliminate.

#### 3.3 Add cache-handler env vars to `.env.template`

Per the official doc §5, **all** of the variables below are provisioned automatically when deployed to Optimizely DXP — you don't set any of them yourself in Test/Production. The `.env.template` block exists only to document them and to give local dev an opt-out path (leave blank → handler falls back to in-memory, registration skips, CDN purge skips).

Append to `.env.template`:

```bash
# ──────────────────────────────────────────────────────────────────────
# All variables below are PROVISIONED BY DXP in Test/Production.
# In local dev, leave blank to skip Redis, webhook registration, and CDN purge.
# ──────────────────────────────────────────────────────────────────────

# Redis cache handler (cache-handler.mjs)
REDIS_URL=                           # host:port, e.g. myredis.redis.azure.net:10000
OPTIMIZELY_DXP_DEPLOYMENT_ID=        # used to namespace cache keys
AZURE_CLIENT_ID=                     # managed-identity client ID (Redis + CDN auth)

# CDN purge (Cloud Platform Services edge-cache API)
# NOTE: §5 of the official doc lists only the variables above as "set by the
# platform"; these two are referenced in code but missing from the table.
# Treat as "set by the platform" until DXP confirms otherwise — and verify
# they are actually present on Test2 before relying on CDN purge.
OPTIMIZELY_CLOUDPLATFORM_API_URL=
OPTIMIZELY_CLOUDPLATFORM_API_RESOURCE_ID=

# Graph webhook receiver (/hooks/graph) and programmatic registration
OPTIMIZELY_GRAPH_CALLBACK_APIKEY=    # shared secret; sent as x-api-key header
OPTIMIZELY_SITE_HOSTNAME=            # public hostname (e.g. mysite.example.com)
OPTIMIZELY_GRAPH_APP_KEY=            # Basic-auth user for {gateway}/api/webhooks
OPTIMIZELY_GRAPH_SECRET=             # Basic-auth password (from Key Vault)
```

**Removed from earlier drafts:** `OPTIMIZELY_START_PAGE_URL`. The official `/hooks/graph` reads `url.default` directly, so no Start Page stripping is needed (Phase 3.4).

#### 3.4 Implement `/hooks/graph`

New file: **`src/app/hooks/graph/route.ts`**.

Contract (per Optimizely):
- Method: POST
- Auth header: `x-api-key: ${OPTIMIZELY_GRAPH_CALLBACK_APIKEY}`
- Body: `{ type: { subject, action }, data: { docId } }`
- `subject === "doc"` and `action ∈ {"updated", "expired"}` → revalidate; everything else → 200 `{ received: true }`
- `docId` shape: `{UUID-with-dashes}_{locale}_Published`

Drop in the reference implementation from [docs/isr-documentation.md](./isr-documentation.md) §3.2 verbatim. The shape:

```ts
// src/app/hooks/graph/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { purgeCdnCache } from '@/lib/cdn-cache';

const CALLBACK_API_KEY = process.env.OPTIMIZELY_GRAPH_CALLBACK_APIKEY;
const singleKey = process.env.OPTIMIZELY_GRAPH_SINGLE_KEY!;
const gateway = (process.env.OPTIMIZELY_GRAPH_GATEWAY ?? 'https://cg.optimizely.com').replace(/\/+$/, '');
const graphUrl = `${gateway}/content/v2`;

async function graphRequest(query: string, variables: Record<string, unknown>) {
  const res = await fetch(graphUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `epi-single ${singleKey}`,
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`GraphQL request failed (${res.status})`);
  const json = await res.json();
  return json.data;
}

async function revalidateDocId(docId: string): Promise<string> {
  const parts = docId.split('_');
  const id = parts[0].replaceAll('-', '');
  const locale = parts[1];
  const response = await graphRequest(
    `query GetPath($id: String, $locale: Locales) {
       _Content(ids: [$id], locale: [$locale]) {
         item { _metadata { url { default } } }
       }
     }`,
    { id, locale },
  );
  const url = response?._Content?.item?._metadata?.url?.default;
  if (!url) return '';
  const path = url.endsWith('/') ? url.slice(0, -1) : url;
  revalidatePath(path || '/');
  return path || '/';
}

export async function POST(request: NextRequest) {
  const apiKey = request.headers.get('x-api-key');
  if (!CALLBACK_API_KEY || apiKey !== CALLBACK_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const payload = await request.json();
  const { subject, action } = payload.type;
  if (subject === 'doc' && (action === 'updated' || action === 'expired')) {
    const path = await revalidateDocId(payload.data.docId);
    if (path) {
      const hostname = process.env.OPTIMIZELY_SITE_HOSTNAME?.replace(/^https?:\/\//, '');
      if (hostname) {
        purgeCdnCache([`https://${hostname}${path}`]).catch((err) =>
          console.error('[hooks] CDN cache purge failed:', err.message)
        );
      }
    }
  }
  return NextResponse.json({ received: true });
}
```

A few points worth flagging:

- **The handler reads `_metadata.url.default`, not `url.hierarchical`.** Earlier drafts of this plan (and the prior public Optimizely docs) said hierarchical instances need `url.hierarchical` with the Start Page prefix stripped. The current official handler does **not** do this — it always reads `url.default`. The probe data we collected (Phase 0.3) showed `url.default === url.hierarchical` on a HIERARCHICAL instance, so on this instance both fields work.
- **No `OPTIMIZELY_START_PAGE_URL` env var is needed.** Drop it from `.env.template`.
- **Raw `fetch` instead of `GraphClient`.** The webhook is a tight, allocation-light hot path; the SDK adds initialization overhead without a benefit here. Keep the SDK for content reads in `/[...slug]`; use `fetch` here.
- **`Authorization: epi-single ${singleKey}`** is the correct header for the read-only Single Key.
- **Trailing-slash normalisation matters.** Optimizely returns paths with trailing slashes; `revalidatePath` matches the exact path, so `/about/` vs `/about` are different cache entries. The handler strips the trailing slash to match how Next.js stores routes.
- **CDN purge is fire-and-forget**, errors logged but don't fail the response. The webhook always returns 200 so Optimizely doesn't retry on transient CDN issues.

Helper module — `src/lib/cdn-cache.ts` (verbatim from §4 of the doc):

```ts
import { ManagedIdentityCredential } from '@azure/identity';

const API_URL = (process.env.OPTIMIZELY_CLOUDPLATFORM_API_URL ?? '').replace(/\/+$/, '');
const RESOURCE_ID = process.env.OPTIMIZELY_CLOUDPLATFORM_API_RESOURCE_ID;
const SITE_HOSTNAME = process.env.OPTIMIZELY_SITE_HOSTNAME;

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 5 * 60 * 1000) {
    return cachedToken.token;
  }
  const credential = process.env.AZURE_CLIENT_ID
    ? new ManagedIdentityCredential({ clientId: process.env.AZURE_CLIENT_ID })
    : new ManagedIdentityCredential();
  const response = await credential.getToken(`${RESOURCE_ID}/.default`);
  cachedToken = { token: response.token, expiresAt: response.expiresOnTimestamp };
  return response.token;
}

export async function purgeCdnCache(urls?: string[]): Promise<void> {
  if (!API_URL || !RESOURCE_ID) {
    console.warn('CDN cache purge skipped: API URL or resource ID not configured');
    return;
  }
  const purgeUrls = urls ?? (SITE_HOSTNAME
    ? [`https://${SITE_HOSTNAME.replace(/^https?:\/\//, '')}/`]
    : []);
  if (purgeUrls.length === 0) {
    console.warn('CDN cache purge skipped: no URLs to purge');
    return;
  }
  const token = await getToken();
  const res = await fetch(`${API_URL}/v1/edge-cache/purge`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ urls: purgeUrls }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`CDN cache purge failed (${res.status}): ${body}`);
  }
  const data = await res.json();
  console.log(`CDN cache purge accepted (operationId: ${data?.operationId})`);
}
```

The 202 response carries an `operationId` — the purge is async. We don't poll it; fire-and-forget is correct.

> **Module name is `cdn-cache.ts`, not `cdn-purge.ts`.** The official doc uses `cdn-cache`; matching the name keeps imports interchangeable with the reference and any future Optimizely sample updates.

#### 3.5 Programmatically register the webhook (`src/instrumentation.ts`)

Optimizely's pattern registers the webhook from the application itself, not the CMS UI. This is great for environment hygiene (the webhook URL changes when slots rotate; programmatic registration survives that).

New file at **`src/instrumentation.ts`** (NOT repo root — the official doc places it under `src/`, which is correct for this project's `srcDir` layout). Use the reference implementation from [docs/isr-documentation.md](./isr-documentation.md) §3.1 verbatim. Shape:

```ts
// src/instrumentation.ts
export async function register() {
  const gateway = (process.env.OPTIMIZELY_GRAPH_GATEWAY ?? 'https://cg.optimizely.com')
    .replace(/\/+$/, '');
  const appKey = process.env.OPTIMIZELY_GRAPH_APP_KEY;
  const secret = process.env.OPTIMIZELY_GRAPH_SECRET;
  const callbackApiKey = process.env.OPTIMIZELY_GRAPH_CALLBACK_APIKEY;
  const hostname = process.env.OPTIMIZELY_SITE_HOSTNAME;
  if (!appKey || !secret || !callbackApiKey || !hostname) return;

  const baseUrl = hostname.includes('://') ? hostname : `https://${hostname}`;
  const webhookUrl = `${baseUrl.replace(/\/+$/, '')}/hooks/graph`;
  const webhooksEndpoint = `${gateway}/api/webhooks`;
  const auth = `Basic ${Buffer.from(`${appKey}:${secret}`).toString('base64')}`;

  try {
    const listRes = await fetch(webhooksEndpoint, { headers: { Authorization: auth } });
    if (!listRes.ok) throw new Error(`List webhooks failed (${listRes.status})`);
    const existing = await listRes.json();
    const matching = existing.filter((w: any) => w.request?.url === webhookUrl);

    // Deduplicate: if multiple webhooks exist for our URL,
    // keep the one with the highest ID and remove the rest.
    if (matching.length > 1) {
      const sorted = [...matching].sort((a: any, b: any) => a.id.localeCompare(b.id));
      for (const hook of sorted.slice(0, -1)) {
        await fetch(`${webhooksEndpoint}/${hook.id}`, {
          method: 'DELETE',
          headers: { Authorization: auth },
        });
      }
      return;
    }
    if (matching.length === 1) return; // already registered

    await fetch(webhooksEndpoint, {
      method: 'POST',
      headers: { Authorization: auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        disabled: false,
        request: {
          url: webhookUrl,
          method: 'post',
          headers: { 'x-api-key': callbackApiKey },
        },
        topic: ['*.*'],
        filters: [{ status: { eq: 'Published' } }],
      }),
    });
  } catch {
    // Non-fatal — Graph API may be briefly unavailable at startup; next boot retries.
  }
}
```

Key behaviour to keep:

- **"Keep one, dedupe the rest" — not "delete-then-create on every boot."** Earlier drafts of this plan said "delete every matching webhook then create a fresh one" on every container start. That's wrong: between the DELETE and the POST there's a window where zero webhooks exist for the site, so any publish in that window is silently lost. The official pattern only acts when there are *too many* (delete duplicates) or *too few* (register fresh). If exactly one exists, do nothing.
- **Sort by string-comparison of `id` and keep the highest.** Don't try to be clever with timestamps.
- **Silent catch.** If the Graph API is briefly unreachable at boot the function exits; the next container start will retry. The `instrumentation` hook must never throw — Next.js will fail to start.
- **No need to gate on `NEXT_RUNTIME === 'nodejs'`.** Optimizely's reference doesn't and Next.js's instrumentation hook is already Node-only by default.

#### 3.6 Local-dev defaults

Local dev cannot register a public webhook (Graph can't reach `localhost`), and DXP-only env vars (`REDIS_URL`, `AZURE_CLIENT_ID`, etc.) are not set. The handler and registration both already fall back gracefully:

- `cache-handler.mjs` → no `REDIS_URL` → in-memory `Map` (single-replica dev is fine).
- `register-webhook.ts` → missing env → log + skip.
- `purgeCdn` → missing env → log + skip.

For manually firing a webhook against a local dev server:
```bash
curl -X POST 'http://localhost:3000/hooks/graph' \
  -H 'x-api-key: <local-test-key-set-in-.env>' \
  -H 'Content-Type: application/json' \
  -d '{"type":{"subject":"doc","action":"updated"},"data":{"docId":"<real-guid>_en_Published"}}'
```

#### 3.7 Ensure middleware does not capture either route
- File: `src/proxy.ts`
- Current matcher (`/diagnostics/:path*`, `/api/diagnostics/:path*`) already excludes `/hooks/graph`. No change needed.
- If you later add real locale middleware, **explicitly exclude** `/hooks/*` and `/api/*`. The single most common cause of "publish webhook silently 404s" is the matcher rewriting POST `/hooks/graph` to `/en/hooks/graph`.

---

### Phase 4 — SEO: structured metadata, sitemap, robots, canonical

#### 4.1 Set `metadataBase` and defaults in root layout
- File: `src/app/layout.tsx`

```ts
export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL ?? 'http://localhost:3000'),
  title: { default: 'Optimizely SaaS CMS Example', template: '%s | Optimizely SaaS CMS Example' },
  description: 'Using Optimizely SaaS CMS, Content JS SDK, Frontend Hosting and Next.js',
  robots: { index: true, follow: true },
  openGraph: { type: 'website', siteName: 'Optimizely SaaS CMS Example' },
};
```
Add `SITE_URL` to `.env.template` and `.env`. Set per environment.

#### 4.2 Per-page metadata via `generateMetadata`
- File: `src/app/[...slug]/page.tsx` and `src/lib/seo.ts`
- `generateMetadata` calls the same cached `getPageContent(slug)` — second call is a cache hit.
- Extend `getSeoMetadata` to set canonical (`alternates.canonical`) from the resolved CMS URL.
- If/when locales are added: emit `alternates.languages` for hreflang.

#### 4.3 `app/sitemap.ts`
- New file. Reuses `getAllPagesPaths`. Cache it with a 1-hour `cacheLife` so concurrent crawler hits don't hammer Graph.

```ts
import type { MetadataRoute } from 'next';
import { cacheLife } from 'next/cache';
import { getAllPagesPaths } from '@/lib/optimizely/all-pages';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  'use cache';
  cacheLife({ revalidate: 3600, expire: 86400 });
  const paths = await getAllPagesPaths();
  const base = process.env.SITE_URL ?? 'http://localhost:3000';
  return paths.map(({ slug }) => ({
    url: `${base}/${slug.join('/')}`,
    changeFrequency: 'weekly',
    priority: 0.7,
  }));
}
```

#### 4.4 `app/robots.ts`
- New file. Must reference the sitemap.

```ts
import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const base = process.env.SITE_URL ?? 'http://localhost:3000';
  return {
    rules: [
      { userAgent: '*', allow: '/' },
      { userAgent: '*', disallow: ['/preview', '/api/', '/diagnostics', '/debug'] },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
```

#### 4.5 Gate `/debug` and `/diagnostics` in production
- Add a check in each: if `process.env.NODE_ENV === 'production'` and no signed cookie / basic auth, return 404. Or wire an Optimizely-IP allowlist at the edge.

---

### Phase 5 — Performance polish

#### 5.1 Image optimisation audit
- `src/components/elements/ImageElement.tsx` and `src/components/pages/ArticlePage.tsx` already use `next/image` with `fill` + `sizes`. Good.
- Add explicit `priority` to above-the-fold images (typically the first hero image on a landing page). Currently nothing is marked priority.
- Add `loading="lazy"` to all below-fold images explicitly (default, but make it explicit for clarity).
- Audit `sizes` attributes — `(max-width: 768px) 100vw, 50vw` on all elements is wrong for a hero (should be `100vw`).
- Consider a custom Next.js `loader` if Optimizely DAM exposes its own image-CDN transformations. Today every `/_next/image?…` call goes through the Next.js-hosted optimiser; a DAM loader would skip that hop. (See `optimizely-cms-nextjs/references/image-handling.md` for the Cloudinary-loader pattern.)

#### 5.2 Font loading
- `Geist` and `Geist_Mono` from `next/font/google` — already correct (self-hosted, no FOIT). Add `display: 'swap'` to be explicit.
- Subset config: `subsets: ['latin']` is already set. Confirm latin is enough for site copy.

#### 5.3 `Permissions-Policy` header
- Currently `unload=(self)` only. Add a fuller policy:
  ```ts
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' }
  ```
- Add `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: SAMEORIGIN` for SEO/security points.

#### 5.4 `react/cache` for in-request memoisation
Where `'use cache'` doesn't apply (e.g. inside `/preview`'s request-scoped components), wrap helpers in `cache()` from `react`. Already used in `src/app/diagnostics/_lib/shared.ts` — extend the pattern.

#### 5.5 Drop `force-dynamic` from diagnostics that don't need it
- `/diagnostics/use-cache` and `/diagnostics/on-demand` currently set `dynamic = "force-dynamic"`. With `cacheComponents: true`, this still works but is no longer the recommended idiom. Replace with explicit Suspense + `await connection()` from `next/server` if you want to mark a component dynamic.
- Low-priority cleanup; doesn't affect prod.

---

### Phase 6 — Webhook hardening (post-MVP)

These are nice-to-have but expected for a "production-ready" answer.

#### 6.1 Rate limiting on `/api/revalidate`
- Add Upstash Ratelimit + Redis (or your preferred token-bucket). 60 req/min keyed by IP is generous but bounds the damage from a leaked secret.

#### 6.2 IP allowlist
- Optimizely publishes the IP ranges its webhooks originate from. Add a check at the start of the route handler, or (better) at the Cloudflare layer.

#### 6.3 Structured logging
- Replace `console.log/error` in the webhook with a structured logger (Pino is light, ~3 KB). Log `docId`, `urlType`, resolved path, revalidation outcome.

#### 6.4 Error tracking
- Wire Sentry (or equivalent) around the handler and around `/[...slug]/page.tsx` so prerender failures surface.

---

### Phase 7 — Testing & verification

#### 7.1 Add `/diagnostics/cms-cache` test
A new diagnostic page that:
1. Calls `getPageContent(['en'])` twice in the same request — verifies React-cache deduplication.
2. Reports the time of the cached fetch vs. a `no-store` fetch — verifies `'use cache'` is doing its job.
3. Provides a "POST /api/revalidate (test mode)" button that fires the webhook locally with a known guid.

This is not strictly required, but the existing diagnostics suite is so good for verifying hosting behaviour that it pays to extend it.

#### 7.2 Lighthouse + WebPageTest after each phase
- Phase 1 done → re-run, expect mainly no regression (the change is structural).
- Phase 2 done → expect TTFB drop on prerendered pages.
- Phase 4 done → expect SEO score to climb (sitemap, robots, metadata, canonical).
- Phase 5 done → expect LCP improvement on pages with above-fold images marked `priority`.

Save reports under `docs/perf/`.

#### 7.3 Verify on a multi-replica deployment (if applicable)
If 0.1 confirmed >1 replica:
- Hit `/diagnostics/runtime` to confirm replicas are rotating.
- Trigger `/api/revalidate` for a known path.
- Reload the path 10 times — every replica should serve the new content. If only the replica that received the webhook serves new content, `cacheHandler` isn't shared. Add Redis-backed handler.

---

## 5. Open questions / decisions to make before starting

1. **Locale routing now or later?** Recommendation is "later"; if "now", insert a Phase 1.5 to add `app/[locale]/...` and locale middleware before Phase 2.
2. **Header / Footer from CMS?** Currently hardcoded. If they should be editor-driven, add a `SiteSettingsPage` content type and the `cacheTag(CACHE_KEYS.HEADER, locale)` pattern. Otherwise leave as-is.
3. **`SITE_URL` per environment.** Need to nail down the canonical hostname for each environment (Test1, Test2, Production) before SEO work makes sense. Note: `OPTIMIZELY_SITE_HOSTNAME` (used by the webhook for CDN purge URLs) and `SITE_URL` (used by metadata/sitemap) are typically the same value but kept separate so CDN purge keeps working even if the canonical SEO URL ever moves.
4. **`/preview` access control.** Today it's public. Should it require a CMS-editor cookie or signed token? Not strictly required for the cache plan, but worth flagging.
5. **DXP-side env-var availability on Test2.** Phase 0.4 lists what's required. Confirm with the DXP admin before Phase 3 — without `REDIS_URL`/`AZURE_CLIENT_ID`/`OPTIMIZELY_DXP_DEPLOYMENT_ID` the cache handler silently falls back to per-replica memory and Phase 3 is mostly cosmetic.
6. **Source of `cache-handler.mjs`.** The plan above gives a skeleton; Optimizely also publishes a reference implementation. Check first whether DXP ships one as part of the platform image (e.g. as a default `cache-handler.mjs` mounted into the container), in which case we may only need to extend it rather than write from scratch.
7. **Webhook registration race on parallel container starts.** When a deployment starts N containers in parallel, N copies of `instrumentation.ts` will all try to register the webhook simultaneously. The "delete-then-create" idempotency works but can briefly produce 0 webhooks. If this matters in practice, consider a startup leader-election or moving registration to a one-shot job in the deploy pipeline.
8. **`OPTIMIZELY_SITE_HOSTNAME` needs to differ per environment.** Test2 vs Production must register against their own hostnames. Confirm DXP injects this correctly per slot.

---

## 6. Sequencing & rough effort

| Phase | What | Effort | Risk | Blocker for next phase? |
|---|---|---|---|---|
| 0 | Pre-flight (DXP env vars confirmed, baseline Lighthouse, verify Graph URL types) | 0.5 day | low | yes |
| 1 | `cacheComponents: true`, mark `/preview` `force-dynamic`, extract cached `getPageContent` for `/[...slug]` | 1 day | medium — flipping `cacheComponents` can surface unrelated breakage in the layout/CMS render path; mostly straightforward otherwise | yes |
| 2 | `getAllPagesPaths` + `generateStaticParams` | 0.5 day | low | no |
| 3 | DXP cache handler (`cache-handler.mjs`, `next.config.ts`, env), `/hooks/graph`, CDN purge helper, programmatic webhook registration | 2 days | medium-high — most moving parts, needs Test2 deploy to validate end-to-end | no |
| 4 | SEO — `metadataBase`, sitemap, robots, canonical | 0.5 day | low | no |
| 5 | Perf polish (priority images, headers, sizes) | 0.5 day | low | no |
| 6 | Webhook hardening (rate limit, IP allowlist, structured logging, error tracking) | 1 day | low (additive) | no |
| 7 | Diagnostics extension + Lighthouse runs | 0.5 day | low | n/a |

Total: ~6 days for one engineer. Phase 3 is the biggest in this plan because it spans handler + receiver + registration + CDN purge + multi-environment env-var plumbing. Plan to deploy to Test2 mid-phase to verify the Redis connection and managed-identity tokens actually work — these can only be tested in DXP.

---

## 7. Success criteria

A deploy passes this plan when:

- [ ] `cacheComponents: true` is enabled and the build succeeds.
- [ ] `/[...slug]` is generated at build for every published page (visible in `next build` output as static-generated routes).
- [ ] `cache-handler.mjs` is loaded in Test2 — verifiable by triggering a `revalidatePath` on one replica and confirming a different replica also serves fresh content on the next request.
- [ ] An editor publishing a CMS page causes the corresponding URL on the site to update within 60 seconds with **no manual deploy** AND across all replicas (not just the one that received the webhook).
- [ ] Reloading a CMS page that hasn't been republished is served from cache (CDN HIT or Next.js cache HIT — observable in `x-nextjs-cache` or `cf-cache-status` headers).
- [ ] `/hooks/graph` returns 401 on missing/wrong `x-api-key`, 200 on a `doc.updated` Published payload, 200 with `ignored` for unrelated subjects/actions.
- [ ] On startup, `instrumentation.ts` registers exactly one webhook with Graph pointing at `https://${OPTIMIZELY_SITE_HOSTNAME}/hooks/graph` — confirmed by listing webhooks via `GET ${gateway}/api/webhooks`.
- [ ] CDN purge fires on publish — confirmed by checking the `cf-cache-status` header on the affected URL flips from `HIT` to `MISS` (then back to `HIT` on the request after) within a few seconds of publish.
- [ ] `/sitemap.xml` returns ≥1 URL per published page.
- [ ] `/robots.txt` blocks `/preview`, `/api/`, `/hooks/`, `/diagnostics`, `/debug`.
- [ ] Lighthouse Performance ≥ 90 and SEO ≥ 95 on a representative CMS page.
- [ ] `generateMetadata` and the page render share a single Graph round-trip (verify via Graph access logs or by adding a temporary counter).
- [ ] `/preview` continues to render unpublished content correctly with the communication injector loaded.

---

## 8. What NOT to change

To keep the diff focused and avoid unnecessary churn:

- **`@optimizely/cms-sdk` API usage.** All caching wraps the SDK; never replace SDK calls with hand-written GraphQL except where the SDK genuinely lacks a method (currently: only `getAllPagesPaths` and the webhook's docId→url lookup).
- **Content types and components.** No content modelling changes needed. Header/Footer hardcoding stays unless a separate decision is made (open question 3).
- **Diagnostics suite.** Keep as-is. It already proves the hosting capabilities and remains the canonical place to verify changes haven't regressed.
- **`proxy.ts` matcher.** Don't broaden it — keeping it scoped to diagnostics is correct.
- **Deployment process.** `deploy.ps1` and `opticloud ship` flow are independent of this work.

---

## 9. Reference files (quick links)

Existing:
- [next.config.ts](../next.config.ts) — flag, headers, image domains
- [src/app/layout.tsx](../src/app/layout.tsx) — root layout, metadata, fonts
- [src/app/[...slug]/page.tsx](../src/app/[...slug]/page.tsx) — main CMS catch-all (target of Phase 1.3, 2.2)
- [src/app/preview/page.tsx](../src/app/preview/page.tsx) — preview route (target of Phase 1.2)
- [src/optimizely.ts](../src/optimizely.ts) — SDK registries (no change needed)
- [src/lib/seo.ts](../src/lib/seo.ts) — SEO extractor (target of Phase 4.2)
- [src/lib/config.ts](../src/lib/config.ts) — Graph URL helper (no change)
- [src/proxy.ts](../src/proxy.ts) — middleware (no change)
- [src/app/diagnostics/](../src/app/diagnostics/) — diagnostic suite (target of Phase 7.1)

To create:
- `cache-handler.mjs` (repo root) — Optimizely DXP shared Redis-cluster cache handler (verbatim from the official ref)
- `src/instrumentation.ts` — programmatic Graph-webhook registration on startup (verbatim from the official ref)
- `src/lib/cache/cache-keys.ts`
- `src/lib/cdn-cache.ts` — Cloud Platform Services edge-cache/purge wrapper (verbatim from the official ref)
- `src/lib/optimizely/get-page.ts`
- `src/lib/optimizely/all-pages.ts`
- `src/app/hooks/graph/route.ts` — Optimizely Graph webhook receiver (verbatim from the official ref)
- `src/app/sitemap.ts`
- `src/app/robots.ts`
- `docs/operations/webhook-setup.md` (operator runbook — env vars, troubleshooting, listing webhooks via Graph API)
- `docs/perf/baseline-*.json` (Lighthouse snapshots)

To modify:
- `next.config.ts` — add `cacheHandler`, `cacheMaxMemorySize: 0`, flip `cacheComponents: true`, add security headers
- `package.json` — add `redis`, `@redis/entraid`, `@azure/identity` dependencies
- `.env.template` — add the env-var block from Phase 3.3 (all DXP-provisioned)

---

*Plan prepared 2026-04-27. Revisit Phase 0 results before committing to Phase 1+ effort estimates.*
