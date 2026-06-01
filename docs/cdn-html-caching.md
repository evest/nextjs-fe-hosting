# CDN HTML caching at the Cloudflare edge

**Status:** designed, not yet active — blocked on Optimizely adding the
Cloudflare config (see [TODO](./todo-cdn-html-caching.md)).
**Owner:** Steve.
**Related:** [`caching-and-isr-plan.md`](./caching-and-isr-plan.md) (the
overall caching architecture), [`isr-documentation.md`](./isr-documentation.md)
(webhook + purge), [`src/lib/cdn-cache.ts`](../src/lib/cdn-cache.ts) (the
purge client), [`src/app/hooks/graph/route.ts`](../src/app/hooks/graph/route.ts)
(the webhook that fires the purge).

---

## TL;DR

Optimizely Frontend Hosting puts **Cloudflare** in front of the Next.js
container. Today Cloudflare **does not** cache our HTML — every page request
goes to the Azure origin and runs a per-request render. We *can* add an edge
HTML cache, which would cut TTFB on warm hits and offload the origin. The
purge half is already built and firing on publish; the cache half was designed
for but never activated.

This doc explains the model, the one real footgun (RSC), and the division of
responsibility once Optimizely enables it.

---

## Current state (measured 2026-06-01)

A live request to a CMS HTML page:

```
$ curl -sI https://test.contentgurus.no/en
Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate
cf-cache-status: DYNAMIC
Vary: rsc, next-router-state-tree, next-router-prefetch,
      next-router-segment-prefetch, Accept-Encoding
```

- `Cache-Control: private, no-store` → the origin tells Cloudflare **not** to
  cache. Cloudflare obeys (`cf-cache-status: DYNAMIC` = bypassed).
- So **every** `/en`, `/no/...` request reaches Next.js and renders the dynamic
  hole per-request. The `'use cache'` data cache (`cacheLife('max')`) makes that
  render cheap — no Graph call — but we still pay the full origin round-trip and
  an RSC render on every hit.

The design doc ([`caching-and-isr-plan.md`](./caching-and-isr-plan.md), the
architecture diagram) *assumes* `GET /en/about → cached HTML hit`. That intent
was never realized because the origin emits `no-store`. The purge plumbing,
meanwhile, is fully wired and runs on every publish — purging a cache that
currently holds nothing.

## Why our pages are render-per-request (not fully prerendered)

Under `cacheComponents: true` (PPR) a component is in the **static prerendered
shell** only if it touches **zero request-time input**. The catch-all page
reads `await params` on its first line:

```ts
// src/app/[locale]/[[...slug]]/page.tsx
const { locale, slug } = await params;   // ← request-time input
```

For a catch-all `[[...slug]]`, the slug isn't known at build time, so the page
body (`PageContent`) is necessarily a **dynamic hole** inside `<Suspense>`,
rendered per-request. Confirmed in the build artifacts: the prerender manifest
lists `/llms.txt`, `/robots.txt`, `/diagnostics` as prerendered routes but
**not** `/en` or `/no`, and the route segment is marked `$d$locale` (dynamic).

Two separate caches are in play, and they are easy to conflate:

| Cache | What it holds | Lifetime | Purged by |
| --- | --- | --- | --- |
| **Next.js data cache** (`'use cache'` in `getPageContent`) | the Graph payload for a slug | `cacheLife('max')` (indefinite) | webhook `revalidateTag`/`revalidatePath` |
| **CDN HTML cache** (Cloudflare edge) | the rendered HTML document | TODO — not active | webhook `purgeCdnCache()` |

"Data is cached and purged on publish" (true) and "the HTML body renders
per-request" (also true) coexist. ISR removes the *Graph latency*; it does not
move the dynamic hole into the static shell. Only an edge HTML cache removes the
per-request origin render from the warm path.

---

## What edge HTML caching buys us

Warm path today:

```
browser → Cloudflare (bypass) → Azure origin → Next.js render (shell + stream hole)
```

Warm path with edge HTML caching:

```
browser → Cloudflare edge (HIT) → done
```

- **TTFB**: the LCP breakdown on `/en` showed ~283 ms TTFB. A warm edge hit
  serves from the nearest PoP with no origin trip and no render — typically a
  large TTFB reduction for repeat/shared visitors.
- **Origin offload + resilience**: traffic spikes and most repeat traffic never
  touch the container.
- **Caveat — it's incremental, not transformative.** Our origin render is
  already cheap (data cached, shell static). The win is network latency and
  origin protection, not unblocking a slow render. It would *not* have fixed the
  CLS/LCP issues addressed separately — those were render-shape problems.

This is a good fit for us specifically because **all HTML is fully shared** —
no per-visitor/per-session/auth/personalization baked into the document, so any
URL is safe to cache at the edge.

---

## The one real footgun: RSC vs HTML on the same URL

App Router serves **two different payloads at the same URL**:

- A normal browser document load → **HTML**.
- A client-side soft navigation / prefetch → an **RSC flight payload** (the
  request carries `RSC: 1` / `Next-Router-Prefetch: 1` headers).

That is why our responses `Vary` on `rsc`, `next-router-state-tree`,
`next-router-prefetch`, `next-router-segment-prefetch`. If an edge cache stores
the HTML document and later serves it for an RSC request (or vice versa),
client-side navigation **breaks** (hydration/router errors, wrong content).

**The cache must therefore distinguish RSC requests from document requests and
never serve one for the other.** There are two ways to satisfy this:

1. **Honor `Vary` on the `RSC`/`Next-Router-*` headers** so RSC and HTML are
   stored under different cache keys for the same URL; or
2. **Bypass caching entirely for requests carrying those headers** and cache
   only full-document requests.

We are assuming **Optimizely will configure Cloudflare to do this for us**
(option 2 — exclude RSC from the edge HTML cache). That assumption is the
gating dependency for this work; see the TODO.

---

## Division of responsibility (Optimizely-managed Cloudflare)

Frontend Hosting's Cloudflare zone is **Optimizely-managed** — we do not have
dashboard access to author Cache Rules. That simplifies our side: in this model
the CDN honors the **origin `Cache-Control`**, and edge-only concerns (RSC
exclusion, the cache-HTML switch) are Optimizely's to configure.

| Responsibility | Who | Mechanism |
| --- | --- | --- |
| Enable HTML caching at the edge | **Optimizely** | per-environment Cloudflare config |
| Exclude RSC / `Next-Router-*` requests from the HTML cache | **Optimizely** | Cloudflare Cache Rule (assumed) |
| Emit cacheable `Cache-Control` on CMS HTML routes | **Us** | `next.config.ts` `headers()` / `proxy.ts` |
| Keep `/preview`, `/hooks/*`, `/diagnostics` uncacheable | **Us** | `no-store` on those routes |
| Purge the edge cache on publish | **Us — already done** | `purgeCdnCache()` from the webhook |

### Our side: cacheable origin headers (when we activate)

Today dynamic PPR routes emit `no-store`. To get edge hits, CMS HTML routes
need something like:

```
Cache-Control: public, s-maxage=31536000, stale-while-revalidate=86400
```

A long `s-maxage` is correct here because **invalidation is event-driven via
the existing purge**, not TTL — the same philosophy as `cacheLife('max')`. The
edge holds the document "indefinitely" until a publish purges it; SWR lets a
stale copy serve instantly while the edge refetches in the background as a
safety net if a purge is ever missed.

Routes that must stay `no-store`: `/preview` (editor freshness), `/hooks/*`
(POST webhook), `/diagnostics` and `/debug` (dev tooling).

### Our side: purge on publish (already implemented)

[`src/app/hooks/graph/route.ts`](../src/app/hooks/graph/route.ts) already:

1. Validates the `x-api-key`.
2. Resolves the published `docId` → URL path via Graph.
3. `revalidatePath` / `revalidateTag` to clear the Next.js data cache.
4. Fires `purgeCdnCache(['https://{hostname}{path}'])` (fire-and-forget, 202).

When edge caching goes live we should revisit **purge coverage**: the webhook
currently purges the single resolved path. Confirm it covers every variant the
edge caches — e.g. locale roots and any listing/parent pages whose HTML embeds
the changed content (the Next.js `revalidateTag` logic already over-invalidates
parents for the data cache; the CDN purge should match).

---

## Verification (once Optimizely enables it)

```bash
# Warm HTML hit on a CMS page:
curl -sI https://test.contentgurus.no/en | grep -i cf-cache-status
#   first request  → cf-cache-status: MISS
#   second request → cf-cache-status: HIT   ✅

# RSC navigation must NOT be served from the HTML cache:
curl -sI https://test.contentgurus.no/en -H 'RSC: 1' | grep -i cf-cache-status
#   → DYNAMIC / BYPASS (never HIT of the HTML doc)   ✅

# Editor + webhook routes stay uncached:
curl -sI https://test.contentgurus.no/preview | grep -i 'cache-control\|cf-cache-status'
#   → no-store / DYNAMIC   ✅

# Publish → purge → re-warm:
#   1. publish a page in the CMS
#   2. webhook fires purgeCdnCache for its URL
#   3. next request → MISS, then HIT again   ✅
```

---

## Open question for Optimizely

Confirm whether their managed Cloudflare **honors a `public, s-maxage=...` from
our origin by default**, or whether there is a per-environment "cache HTML"
switch on their side that must also be flipped — and confirm their RSC
exclusion rule so we don't have to do it at the origin. This determines whether
shipping our `Cache-Control` change alone is sufficient. See the TODO.
