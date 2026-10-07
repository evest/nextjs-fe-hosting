# Performance

The site scores in the mid-to-high 90s on **mobile** Lighthouse, with CLS at 0
and almost no main-thread blocking, on a fully CMS-driven, multilingual Next.js
site with Visual Builder. This page covers the current numbers, how we measure,
what made the difference, what didn't, and what's left.

For the full narrative — including the investigation that proved the hero
image was *not* the LCP element — see
[Engineering a fast front-end on Optimizely SaaS CMS](performance-engineering-story.md).

## Current scores

Mobile Lighthouse, median of 3 runs against the deployed Test2 environment,
October 2026:

| Page | Performance | Accessibility | Best Practices | SEO | FCP | LCP (lab) | TBT | CLS |
|---|---|---|---|---|---|---|---|---|
| Home (`/en`, Visual Builder) | **94** | 100 | 100 | 100 | 1.0 s | 3.0 s | 5 ms | 0 |
| Article | **97** | 100 | 100 | 100 | 1.0 s | 2.7 s | 14 ms | 0 |

The lab LCP is simulated on a throttled connection. Real Chrome traces with
the same mobile emulation put LCP at about **1.0–1.1 s** — the gap is
explained under [What's left](#whats-left).

### How we got here

| Milestone | Home | Notes |
|---|---|---|
| First measurement (June) | 72 | FCP 2.7 s, LCP 5.7 s, Best Practices 77 |
| Web Experimentation snippet made opt-in | 84 | FCP 2.7 s → 1.0 s, Best Practices → 100 |
| Contrast fixes, image `sizes` | — | Accessibility → 100; article page 90–94 |
| Fewer fonts, card images, preconnect | 91 | Home LCP −1.0 s; article 95 |
| SDK 3 / Next 16.3 + cache handler fixes (October) | 94 | Article 97 |

Every run is stored in
[`history.jsonl`](../scripts/lighthouse/results/history.jsonl).

## How we measure

Lighthouse is noisy, and guessing is the enemy of performance work, so the
repo includes a small harness around the Lighthouse CLI
([`scripts/lighthouse/`](../scripts/lighthouse/README.md)):

```bash
npm run lh                       # mobile, median of 3, against Test2
npm run lh -- --url <url> --runs 5 --label after-fix
npm run lh:trim                  # the failing audits and ranked offenders, as markdown
npm run lh:history               # score trend with ▲/▼ deltas
```

The rules we kept relearning:

- **Measure the deployed environment, never localhost.** Only the deploy has
  the production caching (Redis, CDN) that real visitors get.
- **Trust the median and report a range.** Don't chase a two-point swing.
- **Verify a diagnosis with a real browser trace before acting on it.** We use
  the [Chrome DevTools MCP](https://github.com/ChromeDevTools/chrome-devtools-mcp)
  (configured in [`.mcp.json`](../.mcp.json)) for LCP phase breakdowns and
  network waterfalls. Lab scores and tools can misattribute the cause.
- **One change at a time**, and write down the negative results too.

## What made the difference

**Architecture that does the work up front:**

- **Partial Prerendering.** With `cacheComponents`, the page shell (header,
  footer, layout) is prerendered and served immediately; only the
  content-dependent part streams in. This is what keeps FCP around 1 s.
- **Cached content reads.** Every CMS read is wrapped in `'use cache'` and
  invalidated by the publish webhook, so a page render almost never calls
  Optimizely Graph. See [caching](caching.md).
- **Server Components by default.** There is very little client JavaScript,
  so Total Blocking Time stays in single-digit milliseconds.

**Targeted fixes:**

| Fix | Effect |
|---|---|
| **Load third-party scripts deliberately.** The Web Experimentation snippet must load parser-blocking in `<head>` to avoid flicker, so it costs FCP wherever it loads. It's now a CMS setting, switched on only where an experiment runs. | Home 72 → 84, FCP 2.7 → 1.0 s |
| **Only ship fonts that render.** The stylesheet had 25 `@font-face` rules across four families; three were barely used, and one delayed the home page's LCP text. Now one display serif remains. | 25 → 5 `@font-face` rules, home LCP −1 s |
| **Accurate image `sizes`.** Card images never exceed ~400 px, but `33vw` made wide screens fetch 750 px+ renders. The hero is capped at its container width. | Hero ~174 KB → ~55 KB AVIF on mobile |
| **Resize images at the edge.** A custom `next/image` loader builds Cloudflare `/cdn-cgi/image/` URLs for CMS and DAM assets with `format=auto`, instead of resizing on the single-region origin. | DAM share image 1.4 MB → 43 KB WebP |
| **Preconnect to the image CDNs.** Warms the cross-origin connection during HTML parse. | A few hundred ms on image-bound pages over slow links |
| **Reserve space for streamed content.** The page body's `<Suspense>` fallback reserves height, so the footer doesn't paint at the top and get pushed down. | CLS 0.92 → 0 |
| **Accessible brand colours.** A darker variant of the brand orange for small text on light backgrounds. | Accessibility → 100 |

## What didn't work

Negative results saved us from shipping regressions:

- **Inlining the CSS (`experimental.inlineCss`).** Recommended for Tailwind,
  but it made the article page worse (95 → 92, LCP +460 ms), and FCP rose on
  both pages. The HTML isn't edge-cached, so inlining ~79 KB into every
  response cost more than the CSS request it saved. Reverted; worth retrying
  once HTML is edge-cached.
- **Removing Next.js's legacy polyfills.** About 13 KiB of polyfills ship
  regardless of `browserslist`. The commonly suggested alias targets the wrong
  module and does nothing. Reverted; tracked upstream in
  [vercel/next.js#86785](https://github.com/vercel/next.js/issues/86785).
- **Preloading the hero image.** An analysis tool insisted the hero image was
  the LCP element and should get `fetchpriority="high"`. A trace showed the
  LCP element is a text paragraph, so the advice would have taken bandwidth
  away from the real LCP.

## What's left

The remaining gap is not in the application code. It's in edge configuration:

- **HTML is not cached at the edge.** Every page response is
  `cf-cache-status: DYNAMIC`, so each request goes to the origin. Unthrottled,
  the origin answers in about 150–200 ms from its Redis cache, but on a
  throttled mobile connection that round-trip dominates LCP. Chrome estimated
  fixing it at about 600 ms of FCP and LCP. Cached pages now carry
  `Cache-Control: s-maxage=2592000, stale-while-revalidate` (in June they
  were `no-store`), and the publish
  webhook already purges the CDN. The missing piece is HTML caching on the CDN
  itself, with React Server Component requests kept out of it. Design:
  [CDN HTML caching](cdn-html-caching.md).
- **CMS images are cached for only 4 hours** (`max-age=14400`), although
  they're effectively immutable. Static JavaScript and public assets already
  have one-year immutable caching.
- **Third-party scripts are coming back.** Experimentation, analytics and
  consent will each cost something. The point of optimising everything we
  control is to leave room for them.

## Key files

| File | Purpose |
|---|---|
| [`scripts/lighthouse/`](../scripts/lighthouse/README.md) | Measurement harness and score history |
| [`src/lib/image-loader.ts`](../src/lib/image-loader.ts), [`src/lib/image-cdn.ts`](../src/lib/image-cdn.ts) | Edge image resizing for CMS and DAM assets |
| [`src/app/layout.tsx`](../src/app/layout.tsx) | Fonts, preconnect hints, the experimentation snippet |
| [`src/app/[locale]/[[...slug]]/page.tsx`](../src/app/%5Blocale%5D/%5B%5B...slug%5D%5D/page.tsx) | The PPR page, with its height-reserving `<Suspense>` fallback |
| [`next.config.ts`](../next.config.ts) | `cacheComponents`, cache handler, image loader, static asset headers, and notes on what was tried and reverted |

## Further reading

- [Engineering a fast front-end on Optimizely SaaS CMS](performance-engineering-story.md) — the long-form story
- [Mobile LCP analysis](perf-mobile-lcp-analysis.md) — the LCP investigation and trace data
- [CDN HTML caching](cdn-html-caching.md) — the edge caching design
