# Engineering a Fast Front-End on Optimizely SaaS CMS

> **⚠️ Before publishing externally:** this draft contains internal identifiers
> — the live host `test.contentgurus.no` and the asset hostname
> `app-epsacmsguru2ad8jt002.cms.optimizely.com`. **Redact or generalize these**
> (e.g. `https://example.com`, `https://<your-instance>.cms.optimizely.com`)
> before sharing as a public blog post. They're fine for the internal/colleague
> version. Also re-check that the numbers and "what's left" status are still
> current at publish time.

*How we took a Next.js 16 site on Optimizely Frontend Hosting from a 72 to the
mid-90s on mobile Lighthouse — what worked, what didn't, and the one thing left
that decides whether mobile "passes."*

> **Suggested titles** (pick one for the blog version):
> 1. *Engineering a Fast Front-End on Optimizely SaaS CMS*
> 2. *Chasing 100: A Performance Story with Optimizely CMS, Next.js & Cloudflare*
> 3. *The Last 600 Milliseconds: Why Edge Caching Is the Final Mile for a Dynamic CMS Site*
> 4. *From 72 to 95: A Field Guide to Core Web Vitals on Optimizely Frontend Hosting*
> 5. *Measure, Don't Guess: A Real Performance Investigation (and the Myth of the Hero Image)*
> 6. *The Gold-Standard Front-End for Optimizely SaaS CMS*

---

## TL;DR

We built a content-driven website on **Optimizely SaaS CMS** with the
**Content JS SDK**, rendered by **Next.js 16** (App Router, React 19, Tailwind
v4), deployed to **Optimizely Frontend Hosting** (Cloudflare + Azure). Through
careful, *measured* tuning we moved mobile Lighthouse Performance from **72 →
mid-90s**, FCP from **2.7 s → ~1.0 s**, Best Practices **77 → 100**,
Accessibility to **100**, with **CLS pinned at 0** and **TBT at single-digit
milliseconds**.

Then we hit a wall that no amount of front-end tuning can break through: the
last stretch of mobile **Largest Contentful Paint (LCP)** is gated by
**Time To First Byte**, because the HTML is rendered per-request and **not yet
cached at the edge**. Real Chrome traces put our *actual* LCP around **1.0 s** —
but the lab score sees a slower, throttled number dominated by the origin
round-trip.

The conclusion is genuinely positive: the application is fast and the
architecture is sound. The final mile is **two CDN configuration changes** —
long-lived image caching and HTML edge caching — and once they land, this stack
is a strong candidate for a **gold-standard reference implementation** for
performant sites on Optimizely SaaS CMS.

A note on scope: this report measures the site with third-party scripts (e.g.
the Optimizely Web Experimentation snippet) made opt-in rather than always-on.
Those scripts — plus analytics and cookie consent — are coming back, by design.
The point of optimizing everything we control is precisely to **make room** for
them, so their cost is proportional to their value (see "A note on third-party
scripts" below).

---

## The stack (and why it's a good foundation)

| Layer | Technology | What it gives us |
|---|---|---|
| Content | **Optimizely SaaS CMS** + **Content JS SDK** (`@optimizely/cms-sdk` v2) | Headless content modelling, Visual Builder, typed content via the SDK, GraphQL-style content fetch through Optimizely Graph |
| Framework | **Next.js 16** App Router, React 19 | Server Components, Partial Prerendering (PPR via `cacheComponents`), streaming, `'use cache'` data caching, `next/image` |
| Styling | **Tailwind CSS v4** (Oxide engine) | Atomic CSS, tiny gzipped stylesheet, built-in Lightning CSS minification |
| Hosting / edge | **Optimizely Frontend Hosting** = **Cloudflare** in front of an **Azure** container | Global PoPs, HTTP/3, image transformations, edge caching (when enabled) |
| i18n | **next-intl** | URL-driven locale routing (`/en`, `/no`, `/sv`, `/da`) |

A few design decisions paid off repeatedly:

- **Content is cached, not re-fetched.** Content reads run through a `'use cache'`
  wrapper with `cacheLife('max')`, and a **publish webhook** (`/hooks/graph`)
  invalidates exactly what changed via `revalidateTag`/`revalidatePath`. So even
  though pages render per request, they almost never call Optimizely Graph on the
  hot path — the render is cheap.
- **Cloudflare Image Transformations** do the heavy lifting for images. Both the
  CMS asset zone (`*.cms.optimizely.com`) and the DAM/CMP zone
  (`*.cmp.optimizely.com`) are fronted by Cloudflare, addressed via the
  `/cdn-cgi/image/<options>/<path>` form. We negotiate modern formats with
  `format=auto` and right-size every render.
- **PPR keeps the shell static.** The page chrome prerenders; only the
  content-dependent hole streams in. This is what keeps FCP near 1 s.

This is a lot of good engineering working *for* us before we tune anything.

---

## How we measured (so the numbers mean something)

Lighthouse is noisy, and guessing is the enemy of performance work. We built a
small repeatable harness around the Lighthouse CLI:

- `npm run lh` — runs N times against the **deployed Test2 environment**
  (production-like caching, not localhost), takes the **median**, and appends a
  row to a tracked `history.jsonl` so the trend persists.
- `npm run lh:trim` — distils a report to the sub-0.9 audits and ranked
  offenders.
- `npm run lh:history` — prints the score trend with deltas.

Crucially, we later cross-checked the lab numbers against **real Chrome
performance traces** via the Chrome DevTools MCP (mobile emulation: 412 px,
4× CPU throttle, Slow 4G). That distinction — *simulated lab score* vs.
*observed browser trace* — turned out to be the whole story for LCP.

> **Rule we kept relearning:** measure on the deployed environment, trust the
> median, report a range, and verify any "obvious" cause against a real trace
> before acting on it.

---

## The journey, in numbers

All mobile, median runs, against the live Test2 site. Two representative URLs:
the home page (`/en`, a Visual Builder composition) and an article
(`/blog/why-b2b-content-drives-growth`).

| Milestone | Page | Perf | FCP | LCP | Notes |
|---|---|---|---|---|---|
| First measurement | home | **72** | 2.7 s | 5.7 s | Best Practices 77 |
| Made the Web Experimentation snippet opt-in | home | 84 | 1.0 s | 4.5 s | BP 77→100, FCP 2.7→1.0 s |
| Fixed contrast / a11y | article | 90–94 | 1.0 s | 3.0–3.6 s | Accessibility → 100 |
| Right-sized hero image | article | 94 | 1.0 s | 3.0 s | — |
| Fonts + cards + preconnect | **home** | **91** | 1.0 s | **3.5 s** | LCP −1.0 s on home |
| Fonts + cards + preconnect | **article** | **95** | 1.1 s | **2.9 s** | best result |

Headline deltas over the campaign:
- **Performance: 72 → 95** (article), **72 → 91** (home).
- **FCP: 2.7 s → ~1.0 s.**
- **Best Practices: 77 → 100. Accessibility → 100. CLS: 0. TBT: 3–7 ms.**
- **LCP: 5.7 s → 2.9–3.5 s** (lab) — and **~1.0 s observed in real traces**
  (more on that below).

---

## What worked (and why)

### 1. Load third-party scripts deliberately, not by default

The single biggest jump (72 → 84, FCP 2.7 s → 1.0 s) came from making the
**Optimizely Web Experimentation snippet** a *runtime CMS setting* rather than a
hard-coded, always-on `<script>` in the document head. **Best Practices jumped
77 → 100** at the same time.

It's worth being precise about *why* this snippet costs what it costs — and
fair to the product. A client-side experimentation snippet has to load early and
parser-blocking, because it needs to apply variations *before* first paint to
avoid flicker (the user seeing the original, then a flash to the variant). That
is exactly the position in the critical path that hurts FCP/LCP. This isn't a
flaw unique to Optimizely — **any** client-side A/B tool that prevents flicker
behaves this way. The only way to run experiments *without* that front-end cost
is to **experiment at the edge** (server/edge-side variation assignment), which
was out of scope for this round.

**So the goal was never to remove experimentation — it's coming back.** The
change was to stop loading it *unconditionally on every page*. With it behind a
CMS setting, we can be **considerate about where it loads**: e.g. not on the
start page unless we're actually running a test there, and only on the pages and
campaigns that need it. You pay the snippet's cost where it earns its keep, and
nowhere else.

*Lesson:* the cheapest performance win is often not loading something where it
isn't needed — not deleting it everywhere.

### 2. Right-size every image with accurate `sizes`

`next/image` picks a candidate from `srcset` using the `sizes` attribute. Ours
were lazy (`33vw`, `100vw`) and didn't reflect the real layout, so the browser
sometimes fetched a far larger render than the display box.

- **Hero:** capped `sizes` at the container width (896 px). The hero went from a
  ~174 KB image to a **~55 KB AVIF** on mobile.
- **Card grids:** cards live in a `max-w-7xl` (1280 px) container at 1–3 columns,
  so a card image is never wider than ~390 px. We capped `sizes` at `400px`
  instead of `33vw`, which on wide screens had been pulling 750 px+ renders for a
  390 px slot. This fix touched the shared card components, so it improved *every*
  page that uses them — not just the home page.

We also forced `format=auto` for **DAM images** (the DAM moved to Cloudflare but
doesn't set `format=auto` by default), turning a 1.4 MB PNG share image into a
**43 KB WebP**, and a 12.8 KB avatar PNG into a **1.2 KB AVIF**.

*Lesson:* `sizes` is a promise to the browser. Make it match the CSS, and let
the CDN negotiate the format.

### 3. Ship only the fonts you actually render

The render-blocking stylesheet carried **25 `@font-face` rules** across four font
families. Auditing actual usage:

- **Geist Sans** — referenced nowhere (the body uses a system stack).
- **Geist Mono** — used only on internal diagnostics pages.
- **Manrope** — used only on one hero section… which happened to contain the
  **home page's LCP text element**, so that text was waiting for a webfont swap.

We dropped all three, leaving a single brand display serif. **`@font-face` rules
fell 25 → 5**, and the home LCP text now paints instantly in a system font. This
was the change most responsible for the home page's ~1 s LCP improvement.

*Lesson:* applying a `next/font` CSS variable doesn't mean anything renders in
it. Verify real usage before shipping a font.

### 4. Preconnect to the image CDNs

Hero and card images come from a **cross-origin** CDN. Without a hint, the first
image request pays a full DNS + TCP + TLS handshake (~3 round-trips) before any
bytes. A `<link rel="preconnect" crossorigin>` for the CMS and DAM origins warms
those connections during HTML parse. On a throttled mobile link that's worth a
few hundred milliseconds on any image-bound page.

### 5. Keep layout stable and the main thread idle

We pinned **CLS at 0** by reserving height for streamed content (a PPR
streaming hole, without a height-reserving fallback, dropped the footer in then
shoved it down ~3000 px — a CLS of ~0.9 *and* an invalidated early LCP). And
because almost all rendering is Server Components, **Total Blocking Time stays at
3–7 ms** — there is essentially no client JavaScript fighting for the main thread
before paint. (Total `EvaluateScript` in the first 1.2 s of a trace is ~46 ms.)

---

## What we tried that *didn't* work (and why that's useful)

Negative results saved us from shipping regressions. We kept them documented.

### Inlining the CSS (`experimental.inlineCss`) — reverted

The render-blocking stylesheet is the classic LCP suspect, and Next.js 16 has a
purpose-built flag to inline it as a `<style>` tag, removing the request. The
research said it's *recommended for atomic CSS like Tailwind*. We tried it
properly — A/B on Test2, median of five.

It made things **worse**: article 95 → 92, LCP 2925 → 3386 ms, and **FCP rose on
both pages**. The reason is the crux of this whole story: because our HTML is
currently **uncached** (`no-store`), inlining ~79 KB into *every* response just
inflates a document that's already paying a full origin round-trip. The larger
download outweighed the saved CSS request. **Reverted** — with a note to
reconsider it *after* HTML edge caching lands, when the bigger document would be
served from cache.

### Stripping the legacy-JS polyfill bundle — reverted

Lighthouse flags ~13 KB of legacy polyfills Next.js injects. We attempted to
alias them away; the change was a no-op (wrong bundle entrypoint) and there's no
clean supported fix today. We **reverted** and left a tracking link to the
upstream Next.js issue rather than carry a fragile hack.

### "Just preload/`fetchpriority` the hero image" — declined, with proof

An SEO/GEO analysis tool repeatedly insisted the **hero image at `width=3840`**
was the LCP root cause and that adding `fetchpriority="high"` + a `preload` was
"one small fix from passing." This is the most instructive miss of the project.

We took a **real Chrome performance trace**. The trace engine's own LCP
breakdown said, verbatim:

> *The LCP element (a `<p>`) is **text and was not fetched from the network**.*

The breakdown had only **two phases** (TTFB + render delay), not the four an
image LCP shows — categorical proof the hero is not the LCP element. The
`width=3840` the tool fixated on is merely the *fallback* `src` attribute that
browsers ignore; the network trace confirmed the browser actually downloads the
**750 px** candidate via `srcset`. Acting on that advice would have diverted
bandwidth to a non-LCP image and risked making the real (text) LCP *slower*.

*Lesson:* tooling pattern-matches on `width=3840` in the markup. A trace shows
ground truth. We trusted the trace.

---

## A note on third-party scripts: the goal isn't zero, it's groundwork

It would be easy to read this story as "we made it fast by stripping things out."
That's not the point, and it's worth stating plainly.

Real sites need third-party scripts. Ours will be no exception: the
**Web Experimentation snippet is coming back** (selectively), we'll add an
**analytics tool**, and we'll likely add a **cookie-consent banner** — each of
which has a real cost to Core Web Vitals, and each of which is there for a good
reason (running experiments, understanding usage, respecting privacy law). The
goal was never to get rid of them.

The goal is **to measure and improve what we control first.** Third-party
scripts are, by definition, *not* in our control — we can't make someone else's
tag smaller or faster. What we *can* do is make the first-party foundation as
lean as possible: a static PPR shell, a tiny render-blocking stylesheet, only
the fonts we use, right-sized images, near-zero blocking JavaScript, and (soon)
edge-cached HTML. When that groundwork is solid, **the budget a third-party
script consumes is the script's own cost — not its cost plus the cost of a
sloppy foundation.**

Put differently: a fast base means the inevitable third-party tags land on a
page that can absorb them. And being **considerate about *where* each script
loads** (experimentation only where we're testing, consent only where required,
analytics loaded with the right strategy) keeps their impact proportional to
their value. Optimizing the parts we own is what *earns us the room* to add the
parts we don't.

That's also why this report measures the site with those scripts removed: not to
flatter the score, but to isolate the first-party work and establish the clean
baseline against which the cost of each future addition can be judged honestly.

---

## The wall: why a dynamic CMS site is hard to "pass" on mobile

Here's the honest core of the story, told by the trace.

Our **real, observed LCP is ~1.0–1.1 s** on both pages — well inside the "good"
threshold. But the lab/throttled score sees **2.9–3.5 s**, and an external tool
saw up to 2.8 s. Why the gap? The LCP breakdown:

| Phase | Article | Home (worst trace) |
|---|---|---|
| Time To First Byte | 179 ms | **735 ms** |
| Render delay | 827 ms | 400 ms |
| **Resource load** | **none** | **none** (LCP is text) |

Two things jump out:

1. **TTFB is volatile and dominant.** It swung from ~230 ms to ~735 ms between
   runs of the same page. Chrome's `DocumentLatency` insight failed the
   "server responded quickly" check and put the document's *download-complete* at
   840 ms while the actual download was only 94 ms — i.e. **~735 ms was spent
   waiting for the first byte**. Its estimated savings from fixing it:
   **FCP 621 ms, LCP 621 ms** — the single largest lever in the entire trace.

2. **The render delay is not JavaScript.** TBT is 3–7 ms; total script execution
   is ~46 ms. There's no hydration cost to cut. The delay is the normal pipeline:
   receive HTML → parse → apply the render-blocking CSS → lay out → paint.

The header tells the whole story:

```
$ curl -sI https://test.contentgurus.no/en
Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate
cf-cache-status: DYNAMIC
```

**Every request bypasses the edge and runs a per-request render on the origin.**
Unthrottled, that origin think-time is only ~150–200 ms (the `'use cache'` data
cache is doing its job). But on a real mobile connection, the **DYNAMIC origin
round-trip is forced onto the slow client link**, and that's what inflates TTFB —
and therefore LCP — in the lab.

### Why is the route dynamic in the first place?

Under Next.js PPR, a component is in the static prerendered shell only if it
touches **zero request-time input**. Our catch-all route reads the URL slug
(`await params`) on its first line — and for a catch-all `[[...slug]]` the slug
isn't known at build time. So the page body is, by design, a **dynamic hole**,
and Next.js emits `no-store` for dynamic routes. This is the documented,
correct behaviour — and it's the right default for a CMS that can have
**thousands of pages** we don't want to prerender at build time.

So the architecture is sound; it's just that "render on demand, cache the data"
leaves the **HTML document** itself uncached. That's the wall.

---

## The final mile: two CDN changes

Front-end tuning has done its job — the app is lean, the bytes are small, the
main thread is idle, layout is stable. The remaining headroom is **not in our
application code**; it's in **edge configuration**. Two changes finish the story.

### 1. Long-lived image caching

Today CMS/DAM images return only `Cache-Control: public, max-age=14400` (4
hours) and we see `cf-cache-status: MISS` on first hit. These assets are
effectively immutable (a new image gets a new URL), so they should carry a
**long max-age** and be cached aggressively at the edge. Even our content-hashed
`/_next/static/*` assets currently show `max-age=14400` — those are immutable and
deserve `immutable, max-age=31536000`. This is low-risk and purely upside for
repeat visits.

### 2. HTML edge caching (the big one)

This is the change Chrome itself values at **~621 ms of FCP/LCP**. The plan is
already designed and half-built:

- **Already done (our side):** a publish webhook fires `purgeCdnCache()` for the
  changed URL on every publish — so an edge cache can be safely long-lived and
  invalidated on demand, exactly like our data cache.
- **To do (our side):** emit cacheable headers on CMS HTML routes —
  `public, s-maxage=31536000, max-age=0, must-revalidate, stale-while-revalidate`.
  The long `s-maxage` is correct because invalidation is **event-driven via the
  purge**, not TTL. The `max-age=0` half keeps the *browser* from holding HTML we
  can't purge while the *edge* caches it.
- **To do (Optimizely's side):** enable HTML caching on the managed Cloudflare
  zone, and — the one real footgun — **exclude RSC / soft-navigation requests**
  from the HTML cache (App Router serves a different payload at the same URL for
  client-side navigation; the cache must never serve HTML for an RSC request or
  vice versa).

The warm path goes from:

```
browser → Cloudflare (bypass) → Azure origin → Next.js render
```

to:

```
browser → Cloudflare edge (HIT) → done
```

That removes the origin round-trip from the hot path entirely. Because **all our
HTML is fully shared** (no per-user/auth/personalization baked into the
document), every URL is safe to cache at the edge — which makes us an unusually
clean fit for this model.

> **The honest expectation:** edge caching is the lever that lets the *lab* score
> reflect the *real* speed. Our genuine LCP is already ~1 s; caching collapses
> the throttled TTFB that the lab penalizes us for. It's not a magic render
> speed-up — the render was already cheap — it's about not paying for it on every
> request over a slow link.

---

## So… is a great mobile score achievable on a dynamic CMS site?

Yes — but the path is specific, and it's worth being clear-eyed about it:

- **Front-end engineering gets you most of the way** (we went 72 → mid-90s with
  it) and is entirely in your control: delete blocking third parties, right-size
  images, ship only the fonts you use, preconnect, keep CLS at 0 and the main
  thread idle.
- **The last stretch of mobile LCP, for a per-request-rendered site, is a TTFB
  problem**, and TTFB on a throttled connection is dominated by whether the HTML
  is served from the edge or the origin. **Edge caching is the deciding factor.**
- This is not an Optimizely limitation — it's inherent to *any* dynamically
  rendered site. The Optimizely + Cloudflare combination actually makes the fix
  *available and clean*: the CDN is right there, image transforms are built in,
  and the purge-on-publish plumbing already exists.

---

## Why this is a gold-standard foundation

Step back from the last 600 ms and look at what we get:

- **Authoring:** full Visual Builder, typed content, in-context preview — via the
  Content JS SDK, with editor-friendly touches (e.g. an asset preview that shows
  image metadata and publish state).
- **Correctness at the edge:** event-driven cache invalidation (data *and*
  CDN) on publish, so freshness is immediate without short TTLs.
- **Images:** automatic AVIF/WebP negotiation and right-sized renders from two
  CDNs through one shared transform path.
- **Core Web Vitals:** CLS 0, TBT single-digit ms, FCP ~1 s, real LCP ~1 s,
  Accessibility 100, Best Practices 100, SEO 100.
- **Internationalisation, structured data (JSON-LD incl. Article, FAQ,
  Breadcrumb), SEO metadata, sitemaps, `llms.txt`** — all generated from CMS
  content.

Once the two CDN changes land, this is a clean, repeatable blueprint for a
**fast, content-rich site on Optimizely SaaS CMS** — and a fair claim to a
reference/"gold-standard" implementation.

---

## Appendix: the measurement discipline that made this possible

- Measure on the **deployed environment**, never localhost — only the deploy has
  production-like caching.
- **Median of N**, report a range; Lighthouse is noisy.
- Keep a **tracked history** of every run so trends (and regressions) are
  visible.
- Cross-check the lab score against a **real browser trace** before believing a
  diagnosis — especially for LCP, where the lab model and reality can diverge by
  2× and tools mis-attribute the cause.
- **Land one change at a time** when chasing a metric, so you know which variable
  moved.
- Write down the **negative results** too. "We tried inlining CSS and it
  regressed FCP because the HTML is uncached" is as valuable as any win.

---

*Internal references: `docs/perf-mobile-lcp-analysis.md` (the LCP investigation
+ DevTools trace addendum), `docs/cdn-html-caching.md` and
`docs/todo-cdn-html-caching.md` (the edge-caching design and the
division of responsibility with Optimizely), `docs/new-build-checklist.md`
(the build checklist these findings fed back into), and
`scripts/lighthouse/` (the measurement harness + `history.jsonl`).*
