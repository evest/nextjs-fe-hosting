# Feedback: Optimizely Frontend Hosting ISR Documentation

> Audience: Optimizely Frontend Hosting / DXP developer team
> Author: Steve Celius (steve@optimizely.no)
> Date: 2026-04-29
> Source repo: this project, public repo at https://github.com/evest/nextjs-fe-hosting
> Reference doc evaluated: `docs/isr-documentation.md` (the "Next.js ISR Caching
> and Optimizely Graph Webhooks" guide as supplied to me on 2026-04-28)

This document collects the issues we hit while implementing the official
ISR pattern verbatim against a live DXP Test2 environment, plus the
work-arounds we applied. It's intended as input for revisions to the
official documentation and (where applicable) the platform itself.

The intent here is constructive — most of the reference is solid and
the implementation is up and running on Test2. But following the docs
exactly produced a non-trivial number of build/runtime issues that we
think other customers will hit too, and several of them are easy to fix
in the docs.

---

## Quick summary

We followed `docs/isr-documentation.md` byte-for-byte:

- `cache-handler.mjs` (verbatim from §2.2)
- `next.config.{ts,mjs}` cacheHandler wiring (§2.3)
- `src/instrumentation.ts` programmatic webhook registration (§3.1)
- `src/app/hooks/graph/route.ts` callback handler (§3.2)
- `src/lib/cdn-cache.ts` purge wrapper (§4)
- Env vars from §5

…and used `cacheComponents: true` for the rest of the application,
following the modern Next.js direction (`'use cache'` directive,
`cacheLife`, `cacheTag`, PPR).

**Result: the build failed in three different ways before we landed on
a working configuration.** The application does run on Test2 now and
caching/invalidation work end-to-end, but only after material divergence
from the doc.

The biggest single ask: **clarify whether the official position is
`cacheComponents: true` (modern, aspirational) or `cacheComponents: false`
(matches the §1 reference code).** The two are structurally incompatible
and the doc currently assumes the latter without saying so.

---

## Issues, in priority order

### 1. `createCluster` against Azure Managed Redis floods the build log with cluster-discovery errors

**Severity:** noisy, not fatal at runtime, but dominates DXP build output.

The reference implementation uses `createCluster` from `redis@5.x`:

```js
cluster = createCluster({
  rootNodes: [{ url: `rediss://${host}:${port}` }],
  ...
});
```

Against Azure Managed Redis on DXP, this produces a flood of:

```
[cache] Redis operation failed, using in-memory fallback:
  Cannot read properties of undefined (reading 'replicas')
[cache] Redis operation failed, using in-memory fallback:
  Cannot read properties of undefined (reading 'master')
```

(20+ lines per build worker.) This is a known node-redis bug —
[redis/node-redis #2704](https://github.com/redis/node-redis/issues/2704)
— that triggers when the cluster slot discovery returns a topology shape
the client can't parse. Common with non-AWS-ElastiCache deployments,
including Azure Managed Redis.

The handler's `withFallback` wrapper catches the errors and routes to
the in-memory fallback, so functional correctness is preserved at
runtime where it matters (the production replicas DO connect to Redis
successfully — `x-nextjs-cache: HIT` works as advertised). But:

- Build logs are spammed with these errors per worker.
- It's unclear from logs alone whether Redis is actually working at
  runtime — a real customer might assume the cache layer is broken.
- If Azure Managed Redis is deployed as a single-shard instance (or
  with a topology that node-redis Cluster mode can't parse), `createClient`
  (single-node) would be the correct API instead of `createCluster`.

**Behaviour is intermittent.** We've now observed several builds with
and without these errors *with no code changes between them*. After
the first successful deploy, a subsequent deploy from an unchanged
commit produced clean build logs (no `replicas/master` errors, no
auth failures — see issue 7). That suggests the underlying cause may
not be the node-redis bug itself but rather **infrastructure that gets
provisioned on first deploy**: the build-container's managed-identity
role assignment against Redis, the Redis instance itself, or the Entra
ID propagation that authorises the credentials. Once those settle, the
cluster client connects cleanly and the noise disappears.

If that's the actual mechanism, the practical fix is **documentation,
not code**: a sentence telling first-time customers "if your initial
deploy logs cluster errors and managed-identity auth failures, those
are expected on the first build while the infrastructure provisions —
wait a few minutes and redeploy from the same commit." Without that
note, customers will assume their integration is broken and start
chasing fixes that aren't needed.

**Suggestions:**
- **Confirm whether the first-deploy-provisioning hypothesis is
  correct.** If yes, add a "What to expect on first deploy" section
  to the ISR docs explicitly stating the errors are benign on the
  initial build and a redeploy clears them. This single sentence
  would save the next customer hours of debugging.
- Confirm whether DXP's Azure Managed Redis is actually a multi-node
  cluster or a single-shard instance. If single-shard, switch the
  reference handler to `createClient` (single-node) — that would
  sidestep the node-redis cluster bug entirely, regardless of
  provisioning timing. (Note: this question is about the Redis
  topology, not the application's. DXP runs multiple Next.js replicas
  in production — that's the whole reason a *shared* cache backend is
  needed — but a single-shard Redis instance can still serve any
  number of application replicas. The two are independent.)
- If it must remain a cluster *and* the errors persist beyond first
  deploy on some customer environments, document the observed
  `replicas/master` errors as expected/benign so customers don't
  chase them.
- Consider suppressing the `withFallback` `console.error` per attempt;
  one warning per cooldown window would be sufficient regardless of
  the underlying cause.

### 2. `cacheComponents: true` is structurally incompatible with the §1 reference code

**Severity:** decision-blocking. This is the biggest single ask.

The §1 catch-all example:

```ts
// app/[...slug]/page.tsx
export const revalidate = 60;
export const dynamic = "force-static";
```

Both of these route-segment exports are **forbidden** under
`cacheComponents: true`. The build error is explicit:

```
Route segment config "revalidate" is not compatible with
nextConfig.cacheComponents. Please remove it.
```

So a customer following the doc has two choices:

- **`cacheComponents: false`** — the §1 code works as-is, but the
  customer can't use `'use cache'`, `cacheLife`, `cacheTag`, or PPR.
- **`cacheComponents: true`** — the customer must rewrite the §1
  example using `'use cache'` instead of the segment-config exports,
  and discovers a chain of follow-on issues (issues 3–5 below).

#### Why `cacheComponents: true` matters

This isn't a stylistic preference. The Next.js docs are explicit that
`cacheComponents` + `'use cache'` is the **current model** and the
older route-segment-config approach is **the previous model**:

- The Next.js Caching guide at
  [nextjs.org/docs/app/getting-started/caching](https://nextjs.org/docs/app/getting-started/caching)
  opens with: *"This page covers caching with Cache Components, enabled
  by setting `cacheComponents: true` in your `next.config.ts` file. If
  you're not using Cache Components, see the Caching and Revalidating
  (Previous Model) guide."*
- The corresponding "Previous Model" guide at
  [nextjs.org/docs/app/guides/caching-without-cache-components](https://nextjs.org/docs/app/guides/caching-without-cache-components)
  is literally titled *"Caching and Revalidating (Previous Model)"* and
  states up front: *"This guide assumes you are **not** using Cache
  Components which was introduced in version 16."*
- The `cacheComponents` reference at
  [nextjs.org/docs/app/api-reference/config/next-config-js/cacheComponents](https://nextjs.org/docs/app/api-reference/config/next-config-js/cacheComponents)
  describes it as *"expected to be used in conjunction with `use cache`"*
  and notes that in Next.js 16.0.0 *"this flag controls the `ppr`,
  `useCache`, and `dynamicIO` flags as a single, unified configuration"*
  — i.e., it's the consolidated successor to the prior experimental
  flags.
- The `use cache` reference at
  [nextjs.org/docs/app/api-reference/directives/use-cache](https://nextjs.org/docs/app/api-reference/directives/use-cache)
  starts the Usage section with: *"`use cache` is a Cache Components
  feature. To enable it, add the `cacheComponents` option to your
  `next.config.ts` file."*
- The incompatibility itself is documented in
  [vercel/next.js Discussion #84894](https://github.com/vercel/next.js/discussions/84894)
  ("Route segment config 'dynamic' is not compatible with
  `nextConfig.experimental.cacheComponents`"), where the Vercel team
  states: *"In Next.js 16, the dynamic route segment config has been
  replaced by the new static/dynamic rendering model using cache and
  revalidate."*

In short: the §1 reference code uses what Next.js's own documentation
calls the *previous model*. Customers building greenfield Next.js 16
apps will reach for `cacheComponents: true` because that's where the
docs point, and they'll then discover the §1 reference code doesn't
work.

We chose `cacheComponents: true` for this exact reason. The resulting
incompatibilities consumed most of this implementation effort.

**Suggestions:**
- Pick a position and state it explicitly at the top of the doc:
  "this guide assumes `cacheComponents: false`" (or `true`).
- If both are intended to be supported, provide a parallel `cacheComponents: true` reference example for §1 covering the catch-all pattern,
  including what to do about `generateStaticParams`, `<Suspense>`, and
  status-code handling on 404 (issues 3–5 below).
- If only one is supported today, say which Next.js version will close
  the gap.

### 3. `'use cache'` + `generateStaticParams` + DXP build container = build-fragile

**Severity:** can fail any build, depending on transient Graph latency.

We tried two approaches:

#### 3a. `generateStaticParams` returning real published page slugs

For each slug, the build prerenders the page, which calls
`getPageContent(slug)` (a `'use cache'` function), which calls
`GraphClient.getContentByPath(...)`.

Result: **`USE_CACHE_TIMEOUT` errors** on individual pages during the
DXP build.

```
Error: Filling a cache during prerender timed out, likely because
request-specific arguments such as params, searchParams, cookies()
or dynamic data were used inside "use cache".
  digest: 'USE_CACHE_TIMEOUT'

Error occurred prerendering page "/en/the-people/john-doe".
```

The error message is misleading — we weren't using request-specific
arguments. The actual cause: Next.js's `'use cache'` fill ceiling is
**hard-coded at 50 seconds**, and the DXP build container's connection
to `cg.optimizely.com` has intermittent latency that exceeds 50s for
some pages. (We saw `HeadersTimeoutError` on some builds, and
`USE_CACHE_TIMEOUT` on others. 12/24 pages would succeed before one
tipped over.)

Recovery options are all bad:

- Catch the error and return `null` → `notFound()` → the build records
  a 404 cache entry for a real page, breaking it until the next deploy
  or webhook.
- Throw → the build fails.
- Increase the timeout → not configurable.

#### 3b. No `generateStaticParams` (ISR-only)

Cache Components forbids `generateStaticParams` returning `[]`:

```
EmptyGenerateStaticParamsError: When using Cache Components, all
`generateStaticParams` functions must return at least one result.
```

So the function must exist and return at least one entry. We worked
around this with a deliberately-unmatchable placeholder slug
(`__no-cms-pages-at-build__`) that `getPageContent` short-circuits to
`null` (no Graph call). The catch-all then renders a tiny static 404
for the placeholder. Real pages render via ISR on first request.

This works, but it's **a workaround that the doc would never lead a
customer to**. It also means we ship a build that pre-renders nothing
useful — the entire cache is cold on first deploy until Cloudflare /
Redis warm up via real traffic.

#### What we actually shipped

`getAllPagesPaths()` always returns just the placeholder slug.
`generateStaticParams` therefore prerenders nothing real. Pages render
via ISR on first request and are cached by the shared Redis handler.

This is the only configuration we found that:
- Builds reliably regardless of build-container Graph latency.
- Returns correct 404 status codes for unknown URLs (see issue 4).
- Doesn't risk caching `null`/404 results for real published pages.

**Suggestions:**
- The §1 reference (with its `revalidate = 60` + `force-static`) has
  the same latent fragility under `cacheComponents`. Add a section
  explaining the trade-offs of pre-rendering at build vs ISR-only,
  and recommend ISR-only on DXP unless the customer has guarantees
  about build-container Graph latency.
- The 50s `'use cache'` ceiling is a critical operational detail.
  Document it. (It is hard-coded in Next.js itself but customers
  hitting it have no way to know.)
- Consider whether DXP can guarantee any SLA on build-container →
  Optimizely Graph latency. The current state is "intermittently slow
  enough to fail builds at random."

### 4. 404 status code under PPR is silently 200

**Severity:** real correctness bug for any customer using
`cacheComponents: true`.

When `notFound()` is thrown from inside a `<Suspense>` boundary on a
PPR-enabled route, the response status has already been **committed as
200** because the static shell has already started flushing. The
not-found UI body is rendered, but the HTTP response status remains 200.

Worse: the response carries `Cache-Control: s-maxage=2592000`, so the
CDN caches the not-found UI body **for 30 days under a 200 OK** for
every typo'd URL anyone visits.

We fixed this in our app by calling `notFound()` from `generateMetadata`
(which runs before the response is committed) **and** from the page
component above the Suspense boundary. Both calls share a `'use cache'`
key so it's still one Graph fetch.

The §1 reference code doesn't address this because it uses segment
config that opts out of PPR. But customers using `cacheComponents: true`
who write the obvious data-inside-Suspense pattern will hit this and
not realise it until someone shares a typo'd URL and Cloudflare caches
the 200.

**Suggestions:**
- If/when a `cacheComponents: true` reference example is added (issue 2),
  call out the 404-status-under-PPR pitfall explicitly with the
  `notFound()`-from-generateMetadata pattern.
- Independently, this is worth flagging upstream (`vercel/next.js`) as
  a footgun. Status-code handling under PPR isn't widely understood.

### 5. `EmptyGenerateStaticParamsError` interacts surprisingly with Graph outages

**Severity:** edge case but predictable failure mode.

Cache Components requires `generateStaticParams` to return at least
one entry. Our original implementation returned `[]` when Graph was
unreachable (exactly the scenario `try/catch` was meant to protect
against). The build then failed with `EmptyGenerateStaticParamsError`
even though the function had handled the error correctly.

**Suggestions:**
- Document the "must return ≥1 entry" rule in the ISR guide.
- Recommend the placeholder-slug pattern (or an equivalent) as the
  safe default for `cacheComponents` users.

### 6. `OPTIMIZELY_CLOUDPLATFORM_API_URL` and `OPTIMIZELY_CLOUDPLATFORM_API_RESOURCE_ID` are populated but missing from the §5 table

**Severity:** documentation completeness.

§4's `purgeCdnCache` reads two env vars that don't appear in §5's
"Set by the platform" table:

- `OPTIMIZELY_CLOUDPLATFORM_API_URL`
- `OPTIMIZELY_CLOUDPLATFORM_API_RESOURCE_ID`

We've now verified on our Test2 environment (via a dump of
`process.env` from a runtime container) that **both variables are in
fact provisioned automatically** — `OPTIMIZELY_CLOUDPLATFORM_API_URL`
points at `https://api.cloudplatform.cms.optimizely.com/` and the
resource ID is set. So the platform does the right thing; the doc is
just incomplete.

The risk for a new customer reading §5 first is that they don't see
these vars listed and assume their CDN purge needs manual config.
They might add them to their own deployment env (potentially with a
wrong value), or they might assume CDN purge isn't supported and not
test it. Either way, a one-line addition to the §5 table avoids the
confusion.

**Suggestions:**
- Add both vars to the §5 table with the same wording as the others
  ("Set by the platform").

### 6a. `OPTIMIZELY_SITE_HOSTNAME` is the internal Azure hostname, not the public hostname — breaks CDN purge target

**Severity:** real correctness bug — CDN purge silently misses every
target URL once HTML caching is enabled.

On our Test2 environment, `OPTIMIZELY_SITE_HOSTNAME` is set to:

```
epsa05head3wy8zt002.dxcloud.episerver.net
```

…which is the internal Azure container hostname. The site's actual
public hostname (the one Cloudflare proxies and the one users hit) is
`fetest2.optimize.li`.

This is a problem because §3.2's reference webhook code uses
`OPTIMIZELY_SITE_HOSTNAME` to build the CDN purge target:

```ts
const hostname = process.env.OPTIMIZELY_SITE_HOSTNAME?.replace(/^https?:\/\//, "");
if (hostname) {
  purgeCdnCache([`https://${hostname}${path}`]).catch(...)
}
```

So the purge API is being called with
`https://epsa05head3wy8zt002.dxcloud.episerver.net/<path>` — an
internal hostname that Cloudflare has never seen. The purge succeeds
(the Cloud Platform Services API doesn't validate the hostname against
your zone), but it invalidates nothing the user can reach. Once HTML
caching is enabled at the Cloudflare layer (issue 8), the
publish→invalidate flow will be silently broken.

The same `OPTIMIZELY_SITE_HOSTNAME` is also used by §3.1's
`instrumentation.ts` as the webhook target URL. That probably works
because Optimizely Graph likely has internal routing that resolves the
internal hostname, but it's worth confirming.

§5 describes `OPTIMIZELY_SITE_HOSTNAME` as *"Public hostname of the
site (e.g. mysite.example.com)"*. The actual provisioned value is not
the public hostname.

**Suggestions:**
- Either populate `OPTIMIZELY_SITE_HOSTNAME` with the actual public
  hostname (matching the §5 description), or split into two variables:
  - `OPTIMIZELY_INTERNAL_HOSTNAME` — what the platform routes to
    (current behaviour).
  - `OPTIMIZELY_PUBLIC_HOSTNAME` — the customer-facing hostname for
    CDN purge.
- Update the §3.2 reference code to use whichever variable holds the
  public hostname.
- If the public hostname can be different per environment (Test1 vs
  Test2 vs Production) and per customer DNS configuration, it likely
  needs to be a customer-supplied env var rather than platform-set.

### 7. Redis ManagedIdentityCredential auth fails during build (intermittent)

**Severity:** noise and ~10s of wasted build time on the *initial* deploy;
likely zero impact on subsequent deploys (see "intermittent" note below).

On some builds, DXP build containers have `AZURE_CLIENT_ID` set but the
managed identity isn't authorised against Redis yet, so the connection
fails after a 10s timeout:

```
[cache] Redis cluster error: ManagedIdentityCredential: Authentication failed.
  Message Cannot read properties of undefined (reading 'expires_on')
Redis unavailable, falling back to in-memory cache: Redis connection timeout (10s)
```

The handler correctly falls back to the in-memory Map, but the build
log gets noisy and the 10s timeout × N parallel workers wastes build
time.

**Behaviour is intermittent — and probably first-deploy-related.** On
the same project, after the first successful deploy, subsequent
deploys from unchanged commits produced clean build logs with neither
the auth failure nor the cluster-discovery errors from issue 1. This
strongly suggests **the supporting infrastructure (managed-identity
role assignment, Entra ID propagation, Redis instance authorisation)
is provisioned on first deploy and takes a few minutes to settle**.
Once it has, the build container connects successfully and the
warnings disappear.

If that's the actual mechanism, the fix that helps the most customers
is **a documentation update**, not a code change. Without it, a first-
time customer sees these errors on their first deploy, assumes their
integration is broken, and starts chasing causes — when "wait a few
minutes and redeploy" would resolve it.

**Suggestions:**
- **Confirm the first-deploy provisioning hypothesis** internally and,
  if correct, add a "What to expect on first deploy" section to the
  ISR docs. Recommended wording (adjust as needed):
  > **First-deploy note.** On your project's initial deploy, you may
  > see Redis cluster-discovery errors (issue 1) and
  > `ManagedIdentityCredential: Authentication failed` warnings in the
  > build log. These are expected while DXP provisions the supporting
  > infrastructure (managed identity, Redis access, Entra ID
  > propagation). The cache handler falls back to in-memory mode for
  > this build, so the deploy still succeeds. Wait 2–5 minutes and
  > redeploy from the same commit; subsequent builds should connect
  > to Redis cleanly.
- Either authorise the build-container managed identity against Redis
  *before* the first build runs (so customers never see the warnings),
  or skip Redis entirely at build time. The handler could check
  `process.env.NEXT_PHASE === 'phase-production-build'` and short-
  circuit to the in-memory Map.
- If the platform team has a reason to keep the Redis connection
  attempted at build, document it.

### 8. Cloudflare doesn't cache HTML by default

**Severity:** observability — the doc implies CDN caching works
out-of-the-box; it doesn't.

The reference correctly produces origin headers:

```
cache-control: s-maxage=2592000, stale-while-revalidate=28944000
x-nextjs-cache: HIT
```

But Cloudflare's default Cache Level "Standard" only caches static
asset extensions (`.js`, `.css`, images). HTML responses get
`cf-cache-status: DYNAMIC` regardless of origin headers. The CDN cache
the doc promises is not actually engaged for HTML until a Cache Rule
is added.

The CDN purge implementation in §4 is targeted at HTML URLs — but if
HTML isn't cached at the edge, the purge has nothing to purge.

**Suggestions:**
- §4 should document the Cloudflare Cache Rule that needs to exist for
  HTML caching to work, with the bypasses (no caching for `/preview`,
  `/api/*`, `/hooks/*`, RSC prefetches with `?_rsc=*`).
- Or, if Optimizely centrally manages this Cache Rule for all DXP
  Frontend Hosting customers, document that fact and the steps to
  request changes.

### 9. The instrumentation hook's "delete-then-create on every boot" earlier draft

**Severity:** rationale missing — easy to misunderstand.

The §3.1 reference correctly uses a "list, dedupe duplicates, register
if missing" pattern:

```ts
if (matching.length > 1) { /* delete all but highest-id */ return; }
if (matching.length === 1) return; // already registered
// otherwise, POST
```

This is *correct*. We initially considered simplifying it to
"delete-then-create on every boot" before reading §3.1 carefully. That
simpler pattern would have a window where zero webhooks exist for the
site, during which any publish would be silently lost.

**Suggestion:**
- Add one sentence after the code in §3.1 explaining *why* it's not
  delete-then-create.

---

## Smaller documentation issues

These are minor but would save customers some Stack Overflow time.

- **The `dirname(fileURLToPath(import.meta.url))` pattern in §2.3** doesn't work in `next.config.ts` because Next compiles it to CommonJS. We had to use `process.cwd()` instead. Worth noting that `.ts` config files have a subtly different shape than `.mjs` config files.
- **§5's note "All these variables are preconfigured as part of the environment when deploying to Optimizely Front-end"** would be more useful as a per-env table (which vars are set on Test1/Test2/Production specifically).
- **The webhook callback returns `{ received: true }` for all valid auth requests, even if the docId is malformed or unrecognised.** That's correct (avoid retries) but worth explaining — we initially thought our handler was broken because malformed test payloads got 200s.

---

## What ended up working for us

For posterity, this is the configuration on Test2 today (origin caching
works; `x-nextjs-cache: HIT`; 404s return 404; webhook receiver and
purge code path intact):

- `cacheComponents: true` in `next.config.ts`
- `cacheHandler` pointing at the verbatim §2.2 reference
- `'use cache'` + `cacheLife('max')` + `cacheTag(slug-derived-tag)` on
  the page-content fetch
- `generateStaticParams` returning **only a placeholder slug** —
  no real CMS paths are pre-rendered at build, ever
- The catch-all body wraps `getPageContent` in `<Suspense>` and calls
  `notFound()` from inside that boundary
- A SECOND `notFound()` call from the page-level component above the
  Suspense boundary, to set the 404 status before PPR's static shell
  flushes
- Verbatim §3 webhook receiver, §3.1 instrumentation, §4 CDN purge
- `redis @redis/entraid @azure/identity` installed (despite known
  upstream bugs in `redis@5.x` cluster mode)

Build is reliable regardless of build-container Graph latency. First
request per URL after a deploy is slow (Graph latency for TTFB);
subsequent requests are fast (Redis cache HIT). Webhook publishes
invalidate per-page within a few seconds.

---

## Suggested next steps for the docs

In priority order:

1. **State the supported `cacheComponents` value at the top of the
   guide.** Issue 2 above is the single most disruptive thing.
2. **Document the build-time Graph latency tradeoff.** Recommend
   ISR-only over `generateStaticParams`-with-Graph for DXP customers.
3. **Add a `cacheComponents: true` parallel example** for §1 covering
   the catch-all, the placeholder workaround, and the 404-status
   handling above the Suspense boundary.
4. **Clarify `OPTIMIZELY_CLOUDPLATFORM_API_*` env vars in §5.**
5. **Document the Cloudflare Cache Rule prerequisite for HTML caching.**
6. **Investigate the `createCluster` errors** against Azure Managed
   Redis. Either fix the topology or update the reference to use
   `createClient`.

Happy to walk through any of these in more detail or share additional
build logs / repro steps.
