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
