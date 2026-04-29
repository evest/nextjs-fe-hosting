# Performance reports

Lighthouse runs for the Test2 environment (`https://fetest2.optimize.li/en`)
captured before and after the Phase 1+2+3 caching/ISR work.

## Files

| File | What it is |
|---|---|
| [`baseline-en.json`](./baseline-en.json) | Pre-work baseline. Ungated app: no `cacheComponents`, no `'use cache'`, no Redis cache handler, no webhook receiver. Single Lighthouse run. |
| [`after-isr-en.json`](./after-isr-en.json) | Post-Phase-3 result. `cacheComponents: true`, shared Redis cache handler, `/hooks/graph` webhook, ISR-only catch-all. **Median of 3 runs** (`--runs=3`). |

The numbered comparisons below are derived from these two files.

## Comparison

### Setup

Both runs:

- Lighthouse 13.1.0
- Mobile form factor (`moto g power (2022)` UA)
- Throttling: 150 ms RTT, 1.4 Mbps down, 4× CPU slowdown (Lighthouse's default mobile profile)
- Same runner machine (benchmarkIndex 5097–5123, ~1% drift — comparable)
- URL: `https://fetest2.optimize.li/en`
- Cloudflare: `cf-cache-status: DYNAMIC` for HTML on both runs (HTML caching at the edge not yet enabled)

### Timestamps

| Run | Fetch time (UTC) | Local time (Europe/Oslo, UTC+2) | Aggregation |
|---|---|---|---|
| **Baseline** | `2026-04-29T12:30:25.748Z` | 2026-04-29 14:30:25 | single run |
| **After ISR** | `2026-04-29T21:36:51.148Z` | 2026-04-29 23:36:51 | median of 3 runs |

Time elapsed between baseline and after-ISR: ~9h. The implementation work
sits between these timestamps as commits on `master`. The deployed Test2
revision at the time of the after-ISR run was at or after commit
`89d6532` (the `/debug` env-var dump that confirmed the configuration).

### Results

| Metric | Baseline | After ISR (median of 3) | Δ | Verdict |
|---|---:|---:|---:|---|
| Performance score | 0.99 | 0.99 | — | held at ceiling |
| Accessibility | 0.98 | 0.98 | — | unchanged |
| SEO | 1.00 | 1.00 | — | unchanged |
| **Server Response Time (TTFB)** | **256 ms** | **127 ms** | **−50%** | **headline win** |
| First Contentful Paint | 913 ms | 911 ms | −2 ms | unchanged |
| Speed Index | 1086 ms | 911 ms | −175 ms | **−16%** |
| Largest Contentful Paint | 1963 ms | 2023 ms | +60 ms | within run-to-run noise |
| Time to Interactive | 2079 ms | 2023 ms | −56 ms | within noise |
| Total Blocking Time | 5.5 ms | 12 ms | +6.5 ms | both essentially zero |
| Cumulative Layout Shift | 0 | 0 | — | unchanged |
| Total bytes | 292.7 KB | 282.2 KB | −10 KB | wash |
| Request count | 21 | 20 | −1 | wash |

### Interpretation

The headline result is the **TTFB drop from 256 ms to 127 ms (−50%)**.
That is exactly what Phase 3's Redis-backed shared cache handler buys
you: requests for previously-rendered pages are served from the Redis
cache on the runtime container instead of going to Optimizely Graph
for content. It tracks with the `x-nextjs-cache: HIT` header observed
on `curl -I` of `/en`.

**Speed Index improved 16%** as a downstream effect of the faster
TTFB — the document arrives sooner, so first paint is closer to the
beginning of the trace.

**LCP and TTI are essentially unchanged.** Both metrics are gated by
the same fonts and images that haven't been touched. The +60 ms LCP
delta is well within the ~10–15% inter-run variance Lighthouse shows
under synthetic throttling. (An earlier single-run "after" capture
showed a +299 ms LCP regression; running with `--runs=3` confirmed
that was measurement noise.)

The **Performance score is unchanged at 0.99** because the page was
already at the score ceiling. Lighthouse can't measure improvements
beyond that point on this page.

### What this comparison does NOT measure

A few things worth knowing before reading too much into these numbers:

1. **CDN edge HIT vs MISS.** Cloudflare currently serves HTML as
   `cf-cache-status: DYNAMIC` (HTML caching at the edge isn't enabled
   yet — see the pending CF ticket in `optimizely-isr-feedback.md`
   issue 8). So the 127 ms TTFB is **all origin** — the request still
   round-trips to Azure even though Redis serves it instantly there.
   Once the Cloudflare Cache Rule is enabled, expect TTFB to drop
   further as repeat requests get served by the nearest edge POP.

2. **First-request cold-start cost.** ISR-only mode (no
   `generateStaticParams` for real pages) means the first request per
   URL after a deploy pays Graph latency. Lighthouse runs against
   already-warm pages here. A real cold-start trace would show a
   slower first paint that doesn't reproduce on subsequent loads.

3. **404 status correctness.** The bug where `notFound()` under PPR
   returned 200 OK doesn't surface in `/en` testing. Verified
   separately via `curl -I http://localhost:3099/this-does-not-exist`
   returning `404 Not Found` (see commit `e1ded9e`).

4. **Cross-replica consistency.** Lighthouse hits one replica per
   request; can't observe cache propagation between replicas.
   Verified separately: the shared Redis cache handler ensures all
   replicas serve the same content.

## How to reproduce

```bash
# Median of 3 runs (best practice — single Lighthouse runs are noisy)
npx lighthouse https://fetest2.optimize.li/en \
  --output=json \
  --output-path=./docs/perf/<your-tag>.json \
  --only-categories=performance,seo,accessibility \
  --runs=3
```

Use `--output=json,html` and `--output-path=./docs/perf/<your-tag>`
(no extension) if you also want the human-readable HTML report.

For traceability, future runs should keep the same:

- URL
- Lighthouse version (currently 13.1.0; pin if reproducing later)
- Form factor (mobile, default profile)
- Runner machine class (compare benchmarkIndex; if drift is >5%, the
  comparison isn't apples-to-apples)
- Cloudflare HTML caching state (currently disabled — note in the
  comparison file if/when this changes)
