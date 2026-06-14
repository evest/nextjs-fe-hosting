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

## UPDATE 2026-06-14 — the `no-store` source is the next-intl middleware, not PPR

A Lighthouse audit of `/en` surfaced two symptoms that both trace to the **same
origin header** this doc is about:

1. **bf-cache disabled** — Lighthouse `bf-cache` audit fails with *"Pages with
   cache-control:no-store header cannot enter back/forward cache."* So beyond
   the CDN miss, the browser's back/forward cache (instant back-button nav) is
   also off. Same root cause, second symptom.
2. **`cf-cache-status: DYNAMIC`** — the edge miss this doc already describes.

### Correction to the earlier root-cause claim

The sections above attribute the `no-store` to *"dynamic PPR routes emit
`no-store`"* (a render-shape consequence of `cacheComponents`). **That is not
the actual cause.** A controlled comparison on 2026-06-14 proves it's the
**next-intl middleware** (`src/proxy.ts` → `createMiddleware(routing)`):

```
# Routes that go THROUGH the next-intl middleware:
$ curl -sI https://test.contentgurus.no/en   → Cache-Control: private, no-cache, no-store, ...
$ curl -sI https://test.contentgurus.no/no   → Cache-Control: private, no-cache, no-store, ...

# Routes EXCLUDED by the middleware matcher (negative-lookahead) — also PPR-dynamic:
$ curl -sI https://test.contentgurus.no/diagnostics → Cache-Control: s-maxage=2592000, stale-while-revalidate=...
$ curl -sI https://test.contentgurus.no/llms.txt    → Cache-Control: public, max-age=300, s-maxage=3600
```

`/diagnostics` is a `◐` partial-prerender (dynamic) route in the build table,
exactly like `/en` — yet it emits a **cacheable** header. The *only* difference
is that `/diagnostics`, `/llms.txt`, `/robots.txt` are excluded by the
`proxy.ts` matcher and `/en`, `/no/...` are not. So PPR dynamic-ness does **not**
force `no-store`; **the middleware does.**

### Why next-intl sets `no-store`

next-intl's `createMiddleware` sets the `NEXT_LOCALE` cookie and, in doing so,
marks the response as personalized — Next.js then emits
`private, no-cache, no-store, max-age=0, must-revalidate`. Confirmed it's
**unconditional**: the header is present even when `NEXT_LOCALE` is already set
(no `Set-Cookie` on the repeat request, but still `no-store`). It's not the
cookie *write* — it's the middleware being in the request path at all.

### What this changes about the fix

The earlier framing — *"blocked on Optimizely's Cloudflare config"* — is only
half right. The edge **caching** (and RSC exclusion) is still Optimizely's to
enable. But **the `no-store` that bypasses the edge is OURS**, emitted by our
middleware. Even with Optimizely's edge cache turned on, an origin `no-store`
will keep bypassing it. So this is now partly an **origin-side** task we can act
on independently:

- [ ] **Override the `Cache-Control` for CMS HTML routes after the next-intl
      middleware runs.** Wrap `createMiddleware(routing)` in `src/proxy.ts` so
      that, for full-document GETs to locale pages, the response header is
      replaced with the cacheable
      `public, s-maxage=31536000, max-age=0, must-revalidate, stale-while-revalidate=86400`
      (per the split-TTL pattern in `cdn-html-caching.md`). Keep `no-store` for
      RSC / `Next-Router-*` requests and for `/preview`, `/hooks/*`,
      `/diagnostics`, `/debug`.
- [ ] **Verify the cookie behaviour still works** after overriding the header —
      next-intl needs `NEXT_LOCALE` to persist locale choice. Overriding
      `Cache-Control` must not drop the `Set-Cookie`. (A page that `Vary`s on
      cookie or carries `Set-Cookie` may still be treated as uncacheable by some
      CDNs — check whether the edge caches a response that also sets a cookie,
      or whether locale persistence needs to move out of the cookie path for
      cacheable routes.)
- [ ] **bf-cache** will recover automatically once the document is no longer
      `no-store` — re-check the Lighthouse `bf-cache` audit after the change.

### ⚠️ Caution — this is load-bearing and interacts with i18n

`src/proxy.ts` is the locale-routing entry point (the `/` → `/no` redirect,
locale detection, `NEXT_LOCALE` persistence all run here). Overriding its
response headers risks breaking locale detection or soft-navigation if done
carelessly. Land this **in isolation**, measure TTFB/LCP before & after, and
test: locale switching, the `/` redirect, soft navigation between pages, and
that `/preview` stays `no-store`. Do **not** bundle it with other perf work.
