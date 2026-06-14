# TODO — Enable Cloudflare edge HTML caching

**Status:** blocked — waiting on Optimizely to add the Cloudflare config
(enable HTML caching + exclude RSC). Pick this up once that's in place.
**Owner:** Steve.
**Related:** [`cdn-html-caching.md`](./cdn-html-caching.md) for the *why* and the
full model. [`caching-and-isr-plan.md`](./caching-and-isr-plan.md),
[`isr-documentation.md`](./isr-documentation.md).

---

## Why this is parked

Optimizely Frontend Hosting's Cloudflare zone is **Optimizely-managed** — we
have no dashboard access to write Cache Rules. Two edge-side things are theirs
to configure and are the blocking dependency:

1. Turn on HTML caching at the edge.
2. **Exclude RSC / `Next-Router-*` requests** from the HTML cache, so
   client-side navigation payloads are never served as HTML (or vice versa).
   This is the one footgun that breaks App Router behind a CDN.

**We are assuming Optimizely will handle the RSC exclusion in Cloudflare.**
Until they confirm and enable it, do not flip our origin to cacheable — caching
HTML without the RSC split risks broken soft-navigation.

## What's already done (no action needed)

- ✅ **Purge on publish** — [`src/lib/cdn-cache.ts`](../src/lib/cdn-cache.ts) +
  the webhook [`src/app/hooks/graph/route.ts`](../src/app/hooks/graph/route.ts)
  already call `purgeCdnCache(['https://{hostname}{path}'])` on every publish.
  Env vars are wired (`OPTIMIZELY_CLOUDPLATFORM_API_URL`,
  `OPTIMIZELY_CLOUDPLATFORM_API_RESOURCE_ID`, `OPTIMIZELY_SITE_HOSTNAME`).
- ✅ **HTML is fully shared** — no per-visitor/auth/personalization in the
  document, so every URL is edge-cacheable. (Re-audit if personalization or
  auth is ever added — see "Watch out for" below.)

## Current measured baseline (2026-06-01)

```
$ curl -sI https://test.contentgurus.no/en
Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate
cf-cache-status: DYNAMIC
```

Origin says `no-store`; Cloudflare bypasses. Every hit renders per-request
(cheap render — data is cached — but full origin round-trip + RSC render).

---

## Checklist (when unblocked)

### 0. Confirm Optimizely's edge behavior (do first)
- [ ] Optimizely has enabled HTML caching for the environment.
- [ ] Optimizely's Cloudflare config **excludes** requests carrying
      `RSC` / `Next-Router-Prefetch` / `Next-Router-State-Tree` headers from the
      HTML cache (or keys on `Vary` so they don't collide).
- [ ] Confirm whether the edge honors a `public, s-maxage=...` from our origin
      by default, or if a separate per-env switch is also required.
- [ ] Ask Optimizely to use a **long Edge TTL + short Browser TTL** split on the
      HTML cache rule (Edge = respect origin `s-maxage`; Browser TTL = override
      ~0/no-cache) so the edge caches but the browser never holds HTML we can't
      purge. Suggested concrete Cloudflare rules are in
      [`cdn-html-caching.md`](./cdn-html-caching.md) ("Suggested Cloudflare
      rules for Optimizely").

### 1. Emit cacheable `Cache-Control` on CMS HTML routes (our side)
- [ ] In `next.config.ts` `headers()` (or `src/proxy.ts`), send
      `public, s-maxage=31536000, stale-while-revalidate=86400` for CMS HTML
      document responses. Long `s-maxage` because invalidation is event-driven
      via the purge, not TTL; SWR is the safety net for a missed purge.
- [ ] Keep `no-store` on `/preview`, `/hooks/*`, `/diagnostics`, `/debug`.
- [ ] If the RSC exclusion must be done at the origin instead of the edge,
      scope the cacheable header to full-document requests only (condition on
      the absence of the `RSC`/`Next-Router-*` headers). Prefer the edge doing
      it; only fall back to origin-side if Optimizely can't.

### 2. Revisit purge coverage (our side)
- [ ] Confirm `purgeCdnCache` purges every variant the edge caches for a
      publish — not just the single resolved path. Candidates: locale roots and
      parent/listing pages whose HTML embeds the changed content. (The Next.js
      `revalidateTag` logic in the webhook already over-invalidates parents for
      the *data* cache; mirror that for the *CDN* purge.)

### 3. Verify live
- [ ] `/en` repeat request → `cf-cache-status: MISS` then `HIT`.
- [ ] `curl -H 'RSC: 1' /en` → `DYNAMIC`/`BYPASS`, never an HTML `HIT`.
- [ ] Soft-navigate between pages in the browser — no router/hydration errors.
- [ ] `/preview` → still `no-store` / `DYNAMIC`.
- [ ] Publish a page → webhook purges → next hit `MISS` then `HIT` with new
      content; confirm staleness window is acceptable.

### 4. Measure before/after
- [ ] Capture TTFB and LCP on `/en` warm-cache before and after, so the gain is
      quantified (and to catch any regression). Land this **separately** from
      other perf changes so only one variable moves at a time.

---

## Watch out for

- **RSC/HTML mixups** — the headline risk. If soft navigation breaks after
  enabling, suspect the edge serving HTML for an RSC request. Roll back the
  origin `Cache-Control` to `no-store` to restore correctness immediately while
  diagnosing.
- **Stale HTML** — bounded by the purge. If a publish doesn't refresh a page,
  check the webhook fired `purgeCdnCache` for that exact URL and hostname.
- **Per-user content** — if auth/personalization/A-B-in-HTML is ever added,
  those routes must be excluded from edge HTML caching. Re-audit the
  "fully shared HTML" assumption at that point.
- **Don't bundle with other perf work** — measure this change in isolation.

## Expected payoff (set expectations)

Incremental, not transformative: our origin render is already cheap (data
cached, PPR shell static), so the win is **TTFB + origin offload + resilience**,
not unblocking a slow render. Most impactful for repeat/shared traffic and under
load. Biggest single lever is removing the origin round-trip on warm hits.

---

## UPDATE 2026-06-14 — root cause is dynamic rendering (NOT middleware/cookie)

A Lighthouse audit of `/en` re-surfaced the `no-store` problem (it also fails
the `bf-cache` audit: *"Pages with cache-control:no-store header cannot enter
back/forward cache"* — same header, second symptom). A focused spike chased
down the **true** cause. Two earlier hypotheses were investigated and
**disproven** — recorded here so nobody repeats them:

| Hypothesis | Test | Verdict |
| --- | --- | --- |
| The `NEXT_LOCALE` cookie forces `no-store` | Set `localeCookie: false`, redeploy-equivalent local build | ❌ `Set-Cookie` gone, but `/en` **still** `no-store` |
| The next-intl **middleware running** forces `no-store` | Scoped the `proxy.ts` matcher to `/` only (so `/en` skips middleware), rebuilt | ❌ `/en` **still** `no-store` with no middleware on it |
| Override `Cache-Control` inside the middleware | `response.headers.set('Cache-Control', …)` in `proxy.ts` | ❌ Next.js **overwrites** middleware-set `Cache-Control` for dynamic pages — the override never reached the client |

> The earlier `/diagnostics` comparison (cacheable) vs `/en` (no-store) was a
> red herring: they differ in *render mode*, not just middleware. `/diagnostics`
> is `○ Static`; `/en` is `ƒ Dynamic`. That render-mode difference — not the
> matcher — is the whole story.

### The actual cause: the catch-all renders dynamically

Per the Next.js build route table, `/[locale]/[[...slug]]` is **`ƒ (Dynamic)`**.
Per the [official CDN-caching guide](https://nextjs.org/docs/app/guides/cdn-caching),
Next.js sets `Cache-Control` strictly by render mode:

- **Static**: `s-maxage=31536000`
- **ISR** (revalidate): `s-maxage={revalidate}, stale-while-revalidate=…`
- **Dynamic**: `private, no-cache, no-store, max-age=0, must-revalidate` ← us

So the `no-store` is emitted by **Next.js itself for a dynamic route**, and it
cannot be overridden from middleware. Neither the cookie nor the middleware is
the cause; the page being dynamic is.

**Why the catch-all is dynamic:** `generateStaticParams` in
[`src/lib/optimizely/all-pages.ts`](../src/lib/optimizely/all-pages.ts) returns
**only a placeholder slug**, not real CMS paths. (That placeholder exists for a
reason: Cache Components forbids `generateStaticParams` returning `[]`.) With no
real params prerendered, every actual page renders per-request → dynamic →
`no-store`. The `'use cache'` wrapper on `getPageContent` removes the *Graph*
latency, but the *route* is still dynamic.

This is confirmed by the Next.js discussion on exactly this case
([vercel/next.js#85551](https://github.com/vercel/next.js/discussions/85551)):
a user with a CMS blog reports *"I add a generateStaticParams. The static params
covered blog return s-maxage and swr now."*

### What this means for the Optimizely dependency

You were right that Optimizely will likely need to enable edge HTML caching
regardless. But note the ordering: **even if CF is set to "respect origin," it
caches nothing today** because the origin says `no-store`. Whatever solution we
pick below, the origin must emit `s-maxage`/`swr` first — otherwise the edge has
nothing cacheable to respect. The two halves are: (1) **origin emits cacheable
headers** = ours (this doc); (2) **edge actually caches + excludes RSC** =
Optimizely's.

### ✅ Done already (2026-06-14) — and what it did/didn't do

- `routing.localeCookie: false` — removes the `NEXT_LOCALE` `Set-Cookie`. This
  did **not** fix `no-store` (the cause is render mode), but it's a prerequisite:
  a cacheable response must not also carry a per-user `Set-Cookie`. Keep it.
- `routing.defaultLocale: 'en'` — unrelated to caching; bundled in the same
  change. `/` now redirects to `/en`.

---

## Solution options for the dynamic→cacheable problem

The goal: make CMS HTML routes emit `s-maxage`/`stale-while-revalidate` so the
edge (once Optimizely enables it) can cache them, while keeping the on-demand,
webhook-purged freshness model. Four options, with the **scaling tradeoff** that
should drive the decision.

### The core tradeoff: on-demand vs. prerender-all

The **current** design (placeholder `generateStaticParams` + `'use cache'`) is
*on-demand-then-cache*: a page is rendered the first time it's requested, then
the data cache serves it cheaply until a publish purges it. **This scales to any
site size** — a 5-page site and a 5,000-page site both pay a one-time render
penalty per page, only for pages anyone actually visits. The cost is the
`no-store` header (no edge HTML caching, full origin round-trip per request).

Full prerender (`generateStaticParams` returns every CMS path) gives cacheable
headers but **builds every page at deploy time** — for a large CMS that's
thousands of Graph fetches per build, slow/fragile builds, and prerendering
pages nobody visits. It trades the per-request penalty for a per-deploy one that
grows with content. **This is the key reason the current placeholder design was
chosen** — don't discard it lightly.

### Option A — Prerender all CMS paths (`generateStaticParams` returns real paths)

Make `getAllPagesPaths()` fetch every published path (like the sitemap's
[`getAllContentPaths`](../src/lib/optimizely/all-content-paths.ts) already does)
across all locales.

- ✅ Pages become ISR/static → Next emits `s-maxage`+`swr` → edge-cacheable.
  Verified mechanism (Next #85551).
- ✅ bf-cache recovers (no more `no-store`).
- ❌ **Doesn't scale.** Build time grows with page count; thousands of pages =
  thousands of build-time Graph fetches. `getAllContentPaths` is already capped
  at Graph's `limit: 100` (see [[project_graph_locales_and_limit]]) — would need
  pagination.
- ❌ Build now hard-depends on Graph reachability (the placeholder exists partly
  to keep `next build` working when the DXP build container can't reach Graph).
- ⚠️ Best for **small/bounded** sites. Reconsider if the CMS is or will be large.

### Option B — Prerender the top-N, leave the long tail on-demand

`generateStaticParams` returns only high-traffic paths (e.g. start page, top
blog posts, key landing pages — sourced from analytics or a curated list);
everything else stays dynamic via `dynamicParams: true`.

- ✅ The pages that matter most for traffic/SEO get cacheable headers; build
  cost is bounded by N, not total content.
- ✅ Keeps the on-demand model for the long tail.
- ❌ Mixed cache behavior (some routes cacheable, some `no-store`) — harder to
  reason about; needs the curated/analytics-driven list maintained.
- ⚠️ A pragmatic middle ground if full prerender doesn't scale but we want the
  important pages edge-cached.

### Option C — Custom cache handler / route-level header (investigate)

Investigate whether Next 16 + `cacheComponents` exposes a supported way to emit
`s-maxage` for an on-demand-rendered route **without** prerendering it (e.g. a
`cacheLife`/`cacheTag` profile that propagates to the response `Cache-Control`,
or a custom `cacheHandler` hook). The Next #85551 thread suggests this is **not
currently possible** for truly dynamic routes (the maintainer pointed to
`generateStaticParams` as the answer), but verify against the installed Next
version — the framework is evolving (the docs describe an in-progress
"pathname-based cache keying" direction).

- ✅ Would preserve the scaling properties of on-demand AND give cacheable
  headers — the ideal if it exists.
- ❌ May not be supported today; needs a spike against our exact Next version
  before committing.

### Option D — Accept dynamic, optimize the render instead

If edge HTML caching can't be unblocked cleanly, accept `no-store` and minimize
the per-request cost: the data is already `'use cache'` (no Graph hit), the PPR
shell is static. Push TTFB down via origin/region tuning rather than edge HTML
caching.

- ✅ Zero risk to the scaling model; nothing architectural changes.
- ❌ Leaves the TTFB/origin-round-trip cost and the bf-cache audit failure on
  the table. Doesn't achieve edge HTML caching at all.

### Recommendation (for a decision later, not now)

Given the site is CMS-backed and **could grow to thousands of pages**, full
prerender (Option A) is the wrong default — it sacrifices the scaling property
that the current design was built for. Lean toward:

1. **Spike Option C** first — if Next exposes a route-level cacheable header
   without prerender, it's strictly best (keeps on-demand scaling + cacheable).
2. If C isn't possible, **Option B** (prerender top-N) as the pragmatic balance.
3. Reserve **Option A** for if/when the total page count is known to stay small.

Whichever we pick, the RSC-exclusion + edge-enable half is still Optimizely's
(see "Suggested Cloudflare rules" in [`cdn-html-caching.md`](./cdn-html-caching.md)),
and the existing publish→`purgeCdnCache` webhook already covers invalidation.

### ⚠️ Cautions for whoever implements

- **Don't break `next build` offline.** The placeholder in `all-pages.ts` keeps
  the build working when Graph is unreachable; any real-path fetch needs a
  graceful fallback to the placeholder on Graph failure.
- **Graph `limit: 100`** — `getAllContentPaths` is capped; a full enumeration
  needs pagination (see [[project_graph_locales_and_limit]]).
- **Measure in isolation** — land the caching change alone, capture TTFB/LCP
  and `cf-cache-status` before/after, so the one variable is clear.
- **Verify RSC isn't served as HTML** once the edge caches (the footgun in
  [`cdn-html-caching.md`](./cdn-html-caching.md)).
