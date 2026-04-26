# Hosting Diagnostics

A self-contained test harness deployed at `/diagnostics` that probes which Next.js / React features actually work on your hosting target (Optimizely Frontend Hosting on Azure containers, in this case). Each test is a real page using a specific feature and reports whether the host serves it correctly.

## How to use

1. **Deploy** the app the way you normally do (`./deploy.ps1`, `opticloud ship`, etc.).
2. **Open** `/diagnostics` in a browser. You'll see the dashboard with all 16 tests grouped by category.
3. **Click into each test.** Every page has the same structure:
   - **What this tests** — what the code is doing
   - **Why it matters** — why you'd care
   - **How to interpret** — what counts as pass/fail
   - **Live evidence** — timestamps, response headers, computed values
   - **Verdict** — either auto-computed or labelled `MANUAL CHECK` with instructions
4. **Reload pages multiple times.** Many verdicts depend on whether timestamps stay frozen vs. update — single-load doesn't tell you anything.
5. **Use DevTools.** Streaming, image optimisation, and server actions are most clearly verified in the Network panel.

The dashboard mirrors the unauthenticated `/debug` route — gate it before exposing on a public production deploy.

---

## Tests

Routes prefixed with `ƒ` are dynamic, `○` are static, `●` are statically pre-rendered via `generateStaticParams`. The classification is shown in `next build` output and is itself a useful diagnostic.

### A. Environment

#### `/diagnostics/runtime` — Runtime info
- **Tests:** Node version, React version, NEXT_RUNTIME, hostname, uptime, memory.
- **How to test:** Reload several times.
- **Pass:** Uptime should grow linearly. PROCESS_ID flipping between two values means a load balancer is rotating you between container replicas — useful to know before interpreting the caching tests.

#### `/diagnostics/build` — Build info
- **Tests:** Build-time timestamp baked into the HTML at `next build`.
- **How to test:** Note the stamp. Reload several times.
- **Pass:** The stamp must NOT change on reload, and should match your most recent deploy time.
- **Fail:** Stamp updates on every reload → page is being rendered dynamically, not statically served.

### B. Rendering modes

#### `/diagnostics/ssg` — Static Site Generation
- **Tests:** `export const dynamic = 'force-static'` page.
- **How to test:** Reload. In DevTools Network, check the document response headers.
- **Pass:** Both stamps stay identical across reloads. `x-nextjs-cache` should be `HIT` or `PRERENDER`; `cache-control` should include `s-maxage` / `public`.
- **Fail:** Stamps change → host isn't serving prerendered HTML; you're paying Node CPU per request for content that should be free.

#### `/diagnostics/ssr` — Server-Side Rendering
- **Tests:** `export const dynamic = 'force-dynamic'` page.
- **How to test:** Reload several times.
- **Pass:** Request time updates every reload. Module-load time only changes when the container process restarts.
- **Fail:** Request time stays frozen → caching is happening when it shouldn't, requests for personalised content will be wrong.

#### `/diagnostics/isr` — Incremental Static Regeneration
- **Tests:** `export const revalidate = 30` page.
- **How to test:** Reload immediately several times. Wait 30+ seconds. Reload twice more.
- **Pass:** Stamp stays constant for 30s, then updates on the request after the window expires.
- **Fail-A:** Stamp changes every reload → ISR not in effect; effectively SSR, slower than intended.
- **Fail-B:** Stamp varies between reloads when PROCESS_ID also flips → multiple container replicas have independent ISR caches, content is inconsistent across visitors.

#### `/diagnostics/static-params` — `generateStaticParams`
- **Tests:** A dynamic `/[id]` route with three pre-rendered IDs (`alpha`/`beta`/`gamma`) plus dynamic fallback for unknown IDs.
- **How to test:** Click each pre-rendered link, reload each. Then click `zeta` (not pre-rendered).
- **Pass:** Pre-rendered IDs have frozen stamps; `zeta` has an updating stamp (or 200 first time then frozen if the host caches dynamic fallbacks).
- **Fail:** `zeta` 404s → the route has `dynamicParams: false` (it doesn't here, but worth knowing).
- **Why it matters:** This is exactly how hundreds of CMS pages get pre-rendered at deploy time via `getAllPagesPaths`.

#### `/diagnostics/ppr` — Partial Prerendering
- **Status:** Currently a static fallback. PPR in Next 16 requires the `cacheComponents` flag (see Trade-offs below).
- **Pass:** With cacheComponents off, the shell stamp is frozen. With cacheComponents on (after the refactor described below), the shell stamp would be frozen AND a dynamic island would update each reload in the same response.

### C. Caching

#### `/diagnostics/use-cache` — Server-side function cache
- **Tests:** `unstable_cache(...)` wraps a function returning `Date.now()`, `revalidate: 60`.
- **How to test:** Reload several times within 60 seconds, then again after 60 seconds.
- **Pass:** Cached stamp stays the same for ~60s, then refreshes. Fresh stamp updates every reload.
- **Fail:** Both stamps update together → function caching not in effect.
- **Note:** This uses the legacy `unstable_cache` API. The newer `'use cache'` directive provides the same thing with better ergonomics but requires `cacheComponents`.

#### `/diagnostics/fetch-cache` — `fetch()` data cache
- **Tests:** Two server-side fetches of `https://api.github.com/zen` (returns a different random quote each call) — one with `next: { revalidate: 60 }`, one with `cache: 'no-store'`.
- **How to test:** Reload several times.
- **Pass:** Cached quote stays identical for ~60s; fresh quote changes every reload.
- **Fail:** Both quotes change every reload → fetch caching disabled.
- **Inconclusive:** Both error → container can't reach github.com; switch the probe to a reachable URL or your own internal endpoint.

#### `/diagnostics/on-demand` — Tag-based revalidation
- **Tests:** Cached function tagged `diagnostics-on-demand` + a button that POSTs to `/api/diagnostics/revalidate`, which calls `revalidateTag('diagnostics-on-demand', 'max')`.
- **How to test:** Note the stamp. Click the button. Reload. Note the stamp.
- **Pass:** Stamp updates after the button + reload cycle.
- **Fail:** Stamp doesn't update → on-demand revalidation broken.
- **Container caveat:** With multiple replicas, `revalidateTag` only invalidates the replica that received the API call. Watch PROCESS_ID across reloads — if it flips, your CMS webhooks will only refresh whichever replica got the webhook, leaving stale content on the others. Fix is configuring a shared cache handler (Redis, etc.).

### D. React 19

#### `/diagnostics/streaming` — Streaming with Suspense
- **Tests:** Three `<Suspense>` boundaries with async server components delayed 0/500/2000 ms. Client-side `<StreamMarker>` records the time each one mounts.
- **How to test:** Open DevTools → Network. Reload. Click the document request → Response. Confirm the body arrives in chunks.
- **Pass:** Mount times are spread roughly 0 / +500 / +2000 ms. Network panel shows chunked response.
- **Fail:** All three mount within a few ms of each other → host is buffering the response (a reverse proxy or load balancer is holding output until the page finishes). Without streaming, slow data fetches block first-byte.

#### `/diagnostics/server-actions` — Server Actions
- **Tests:** Form with `'use server'` action + `useActionState` + `useFormStatus`.
- **How to test:** Open DevTools → Network. Type something, submit. Check the network entry.
- **Pass:** Submission count increments and message echoes back. The POST request to `/diagnostics/server-actions` carries a `Next-Action` request header.
- **Fail:** POST returns non-200, or submitting silently does nothing → host doesn't forward Server Action requests correctly.

### E. Edge

#### `/diagnostics/middleware` — Proxy / middleware
- **Tests:** `src/proxy.ts` (Next 16 renamed `middleware.ts` → `proxy.ts`) sets three `x-diagnostics-middleware-*` headers for any `/diagnostics/*` request.
- **How to test:** Just open the page.
- **Pass (auto):** Headers are present, stamp updates each reload, verdict shows green.
- **Fail (auto):** Headers missing → proxy didn't run, breaks anything that relies on it (auth, rewrites, locale routing).

#### `/diagnostics/edge` — Edge runtime route
- **Tests:** `/api/diagnostics/edge` declares `export const runtime = 'edge'`. Page client-fetches it; the route reports its actual runtime.
- **How to test:** Just open the page; the probe runs automatically.
- **Pass:** `actualRuntime: "edge"` → host fully supports the Edge runtime.
- **Warn:** `actualRuntime: "nodejs (fallback)"` → declaration ignored, route ran on Node. Functionally fine but you don't get cold-start benefits.
- **Fail:** Network error / non-200 → host refused the route entirely.
- **Expected on Optimizely Frontend Hosting:** Likely warn or fail — Optimizely's Azure containers are Node-based, not a true Edge runtime.

### F. Other

#### `/diagnostics/image` — `next/image` optimisation
- **Tests:** `<Image>` with `https://placehold.co/800x600.png` plus a client probe that fetches `/_next/image?url=…&w=640&q=75` directly.
- **How to test:** Open the page; the probe reports response headers.
- **Pass:** Probe `Content-Type` is `image/webp` or `image/avif` → host transcodes images correctly (`sharp` installed, cache dir writable).
- **Warn:** `image/png` → host returns the original asset; you lose bandwidth and Core Web Vitals benefits.
- **Fail:** Non-200 → optimiser broken (often a missing `sharp` install or read-only filesystem).

#### `/diagnostics/draft` — Draft mode
- **Tests:** Page reads `draftMode().isEnabled`. Buttons POST to `/api/diagnostics/draft-toggle` which calls `.enable()` or `.disable()`.
- **How to test:** Click Enable. After the page refreshes, the status should flip to `true`. Open DevTools → Application → Cookies and look for `__prerender_bypass`.
- **Pass:** Flag flips, cookie present.
- **Fail:** Flag doesn't change or cookie isn't set → host is stripping cookies or not forwarding the draft endpoint correctly. Breaks the existing `/preview` route which uses the same mechanism.

---

## Trade-offs and known limitations

### `cacheComponents` is intentionally OFF

The Next 16 `cacheComponents` experimental flag enables:
- The new `'use cache'` directive (more ergonomic than `unstable_cache`)
- Automatic Partial Prerendering on every page (cached islands + dynamic islands in the same response)

Enabling it in `next.config.ts` triggered a constraint: every page that accesses uncached data (e.g. a `fetch()` to your CMS) MUST wrap it in `<Suspense>`. Your existing `src/app/[...slug]/page.tsx` and `src/app/preview/page.tsx` would both need refactoring.

To avoid disrupting those pages, the flag is left off (see comment in `next.config.ts`). The `use-cache` test uses the legacy `unstable_cache` API; the `ppr` test reports a static fallback.

#### To enable later

1. Set `cacheComponents: true` in `next.config.ts`.
2. Refactor `src/app/[...slug]/page.tsx` along these lines:
   ```tsx
   async function Content({ slug }: { slug: string[] }) {
     const content = await getContent(slug);
     if (!content) notFound();
     return <OptimizelyComponent content={content} />;
   }
   export default async function Page({ params }: Props) {
     const { slug } = await params;
     return (
       <Suspense fallback={null}>
         <Content slug={slug} />
       </Suspense>
     );
   }
   ```
3. Same pattern for `src/app/preview/page.tsx`.
4. Remove all `export const dynamic = …` / `revalidate = …` / `dynamicParams = …` exports from the diagnostic pages, replace `unstable_cache` calls with `'use cache'` directives, and add `await headers()` (or another dynamic API) inside Suspense for pages that need to be dynamic.

### Build on Windows

`npm run build` (Turbopack) hits a Windows-specific segfault during the TypeScript-check stage on some machines, even when TypeScript itself is clean. Workaround: `npx next build --webpack`. Linux CI/deploy environments are unaffected.

### Footer change

`src/components/layout/Footer.tsx` was updated to capture `new Date().getFullYear()` in a module-level constant rather than inline in the render. Harmless either way, but defensive against `cacheComponents` if you enable it later.

---

## Files added or changed

### New (diagnostics)
```
src/app/diagnostics/
  layout.tsx
  page.tsx                              # dashboard
  _lib/shared.ts                        # MODULE_LOAD_TIME, PROCESS_ID, requestNow, formatStamp, ageHuman, TESTS list
  _components/
    Verdict.tsx                         # pass/warn/fail/manual badge
    TestPage.tsx                        # consistent layout: what / why / how / evidence
  runtime/page.tsx
  build/page.tsx
  ssg/page.tsx
  ssr/page.tsx
  isr/page.tsx
  static-params/page.tsx
  static-params/[id]/page.tsx
  ppr/page.tsx
  use-cache/page.tsx
  fetch-cache/page.tsx
  on-demand/page.tsx
  on-demand/RevalidateButton.tsx
  streaming/page.tsx
  streaming/StreamMarker.tsx
  server-actions/page.tsx
  server-actions/actions.ts
  server-actions/EchoForm.tsx
  middleware/page.tsx
  edge/page.tsx
  edge/EdgeProbe.tsx
  image/page.tsx
  image/ImageProbe.tsx
  draft/page.tsx
  draft/DraftToggle.tsx

src/app/api/diagnostics/
  revalidate/route.ts                   # POST → revalidateTag
  edge/route.ts                         # runtime: 'edge', reports actual runtime
  draft-toggle/route.ts                 # POST → draftMode().enable() / .disable()

src/proxy.ts                            # sets x-diagnostics-middleware-* headers; matches /diagnostics/*
```

### Modified
- `next.config.ts` — added `placehold.co` to `images.remotePatterns` (used by the image-optimisation test); added explanatory comment about the omitted `cacheComponents` flag.
- `src/components/layout/Footer.tsx` — moved year computation to a module-level constant.

### Not modified
- `src/app/[...slug]/page.tsx`, `src/app/preview/page.tsx`, and all other existing app/CMS code.
