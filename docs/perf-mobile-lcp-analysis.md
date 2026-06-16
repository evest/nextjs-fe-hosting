# Mobile LCP analysis (2026-06-16)

Working notes from chasing the stubborn ~3s mobile LCP on Test2. Measured with
the Lighthouse harness (`npm run lh`, mobile, median of 3) against
`https://test.contentgurus.no`. **The Chrome DevTools MCP was not connected**
this session, so there's no interactive trace here — the conclusions are from
the harness reports + the live HTML/CDN.

## TL;DR

The mobile LCP element on both measured pages is **text, not an image** — so
image byte-size work (real and worth doing) was never going to move LCP much.
The LCP number is gated by **TTFB + the render-blocking Tailwind CSS critical
path** under Lighthouse's simulated mobile throttling. The genuinely
LCP-moving lever left in our control is **preconnect** (done); the big one is
**HTML edge caching** (TTFB), which is parked on Optimizely — see
[`todo-cdn-html-caching.md`](./todo-cdn-html-caching.md).

## Measured baseline (after this session's fixes, pre-deploy)

| Page | Perf | LCP | FCP | LCP element |
|---|---|---|---|---|
| Article `/blog/why-b2b-…` | 94 | 3.0 s | 1.0 s | ingress `<p>` (system-font text) |
| Home `/en` | 84 | 4.5 s | 1.0 s | AdvancedHero body `<p>` (was Manrope) |

CLS 0, TBT 4 ms on both — JS and layout stability are not the problem.

## Why LCP is high when the LCP element is system-font text

LCP phase breakdown (article): TTFB 422 ms + element render delay 130 ms ≈
550 ms of *real* element timing, yet reported LCP is 3.0 s. The gap is
Lighthouse's **simulated throttling** projecting the critical-path: the
render-blocking CSS must download+parse+lay out before the (lower-in-DOM) LCP
paragraph paints. FCP fires at 1.0 s (first styled paint); LCP is the final
paint of the largest element, which lands later on the modeled slow link.

So the two dominant levers are **TTFB** and **render-blocking CSS** — not bytes.

## What was changed this session (and the honest impact)

| Change | Commit | Real benefit | LCP impact |
|---|---|---|---|
| Article hero `sizes` cap (896px) | `df98238` | 174 KB→55 KB hero | Low — hero isn't the LCP element |
| Drop unused Geist Sans/Mono fonts | `d4ad8ba` | −2 font families; 25→12 @font-face | Low |
| Drop Manrope body font → system sans | `83b5c87` | −1 family; 12→5 @font-face; **home LCP text no longer waits for a font swap** | Low–Med (home) |
| Right-size card-grid `sizes` (cap 400px) | `51621fd` | ~140 KB image waste across all card pages | Low (none are LCP) — payload/cache win |
| **Preconnect to image CDNs** | `83b5c87` | Saves DNS+TCP+TLS (~3 RTTs, 300–600 ms) before first image | **Med — the real in-our-control LCP lever** |

Net: `@font-face` rules went **25 → 5** (only the Instrument Serif headline font
remains as a webfont). All image grids now request appropriately-sized renders.
None of these is a silver bullet for the LCP *number* — they're correct hygiene,
and preconnect is the one most likely to show up in the LCP metric.

## What more can we do (ranked by leverage)

1. **HTML edge caching → lower TTFB.** Biggest lever. The origin emits
   `no-store` because the catch-all route is dynamic; the edge therefore caches
   nothing. Full analysis + options (A–D) in
   [`todo-cdn-html-caching.md`](./todo-cdn-html-caching.md). Blocked on
   Optimizely enabling edge HTML caching + RSC exclusion; our half is emitting
   cacheable headers (needs the dynamic→static/ISR decision). **Measure TTFB/LCP
   before+after, in isolation.**

2. **Preconnect (done).** Warms the cross-origin image CDNs so the first
   image request skips the handshake. Verify on the deployed page that the
   `<link rel="preconnect">` for the CMS origin renders (it derives from
   `OPTIMIZELY_CMS_URL`, blank locally).

3. **Reduce render-blocking CSS.** The single global Tailwind stylesheet is
   ~80 KB (compressed ~15 KB) and render-blocking by design. **Hard to improve
   safely** — Tailwind's utility CSS can't be split or made async without FOUC /
   cascade breakage. Removing the unused fonts trimmed the @font-face portion
   (~3 KB); the rest is utilities actually in use. Not a promising lever without
   a framework-level change. Don't rabbit-hole here.

   - **`@source not` for dev-only routes (kept):** excluding `/diagnostics` +
     `/debug` from Tailwind v4's CSS scan dropped ~2.9 KB raw of utilities that
     never render publicly. Small but free and safe. (Tailwind v4 has no
     `content`/`purge`/`safelist` — use `@source not "…"` at-rules in the CSS.)
   - **`experimental.inlineCss` — TRIED & REVERTED (2026-06-16).** Next 16's
     flag inlines the whole sheet as a `<style>`, removing the render-blocking
     `<link>`. It's the only first-party lever for this (critters = no-op on
     App Router; beasties = webpack-only, streaming-incompatible). A/B on Test2
     (Lighthouse median-of-5) **regressed both pages**: article 95→92, LCP
     2925→3386 ms, and **FCP went UP** on both (article +49 ms, home +140 ms).
     Mechanism: our HTML is currently dynamic / `no-store` (no edge caching),
     so inlining ~79 KB into every uncached HTML response inflates the document
     and the larger download outweighs the saved CSS request. **Reconsider only
     after HTML edge caching lands** — once the bigger HTML is CDN-cached the
     tradeoff may flip. Re-measure against the cached-HTML setup before
     re-enabling; do not turn it on blind. (Reverted in next.config.ts; the
     comment there records the same.)

   This reinforces the headline finding: with `no-store` HTML, **TTFB / edge
   caching is the gate** — CSS-delivery tricks can't get around it and can even
   hurt by enlarging the uncached document.

4. **Move/lighten the LCP element.** On both pages the LCP is a paragraph below
   a tall hero. There's no easy structural win — the content is what it is — but
   if a future redesign puts a smaller above-the-fold element first, LCP fires
   earlier. Not worth contorting the design for the metric.

5. **Already ruled out:** image bytes (LCP isn't an image), JS/TBT (4 ms),
   CLS (0), font swap on the LCP text (removed by dropping Manrope).

> **Note — SEO "meta-description" audit flaps (92↔100):** the meta description
> IS present (verified directly); Lighthouse intermittently fails to see it.
> Treat that audit as noise, not a missing tag — don't chase it.

## Honest expectation

With preconnect deployed, expect a modest LCP improvement (handshake overlap).
The step-change to sub-2.5s mobile LCP realistically needs the **TTFB** win from
edge HTML caching — which is the parked Optimizely dependency, not a code fix.
The article (94) is close to its ceiling for the current architecture; the home
page (84) had the most to gain from the Manrope-swap removal + card-image
right-sizing + preconnect, so it's the one to watch on the re-measure.
