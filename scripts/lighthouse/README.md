# Lighthouse harness

Reproducible Lighthouse runs against the **Test2 environment**
(`https://test.contentgurus.no` — note the deploy *target* is "Test2" but its
public hostname is `test.`, **not** `test2.`, which has no DNS record). Test2
has the production-like caching we need for representative numbers — never
localhost. Results are stored over time so we can see improvements
deploy-to-deploy.

Two complementary tools:

1. **These scripts** — scripted, stored-history runs of the `lighthouse` CLI.
2. **Chrome DevTools MCP** (configured in [`.mcp.json`](../../.mcp.json)) — lets
   Claude drive a real headless Chrome to get *traces* (LCP phase breakdown,
   render-blocking analysis, network waterfall) the CLI summary can't give.

---

## Prerequisites

- `lighthouse` on PATH (`npm i -g lighthouse`) and Chrome installed.
- Node ≥ 20.19 / 22.12 (this repo is on 22.19).

## Commands

```bash
npm run lh                       # Test2 (test.contentgurus.no) /en, mobile, median of 3 runs
npm run lh -- --url https://test.contentgurus.no/no
npm run lh -- --label after-snippet-removed   # tag the run in history
npm run lh -- --runs 5                          # more runs = more stable median
npm run lh:desktop               # desktop preset
npm run lh:trim                  # agent-friendly markdown from the latest report
npm run lh:trim scripts/lighthouse/results/<dir>/report.json
npm run lh:history               # score trend table (all runs)
npm run lh:history -- --mobile   # filter
```

### Typical loop

```bash
npm run lh -- --label baseline       # measure
npm run lh:trim                      # → paste the markdown to Claude for a fix plan
#   …apply fixes, deploy to test2…
npm run lh -- --label after-fix      # re-measure
npm run lh:history                   # see the delta (▲/▼ on Performance)
```

## What gets stored

```
scripts/lighthouse/results/
  history.jsonl                       # one row per run — TRACKED in git (the trend)
  2026-06-14_140530_test2.../report.json   # full median LHR — gitignored (bulky)
```

`history.jsonl` is committed so the score history survives across machines;
the per-run `report.json` folders are gitignored. To view a full report
visually, drop its `report.json` into the
[Lighthouse Viewer](https://googlechrome.github.io/lighthouse/viewer/), or use
the Chrome Lighthouse app's own HTML export.

Runs take the **median of N** (default 3) by performance score — Lighthouse is
noisy and Google recommends 3–5 runs. Don't chase a 2-point swing; it's jitter.

---

## Chrome DevTools MCP — getting toward 4×100

[`.mcp.json`](../../.mcp.json) registers Google's official `chrome-devtools-mcp`
with safety flags: `--isolated` (throwaway profile, no lingering logins),
`--headless`, `--no-usage-statistics`, `--no-performance-crux` (no data sent to
Google). **Point it only at our own test2/staging URLs**, never at untrusted
sites or a logged-in browser.

Restart Claude Code after adding `.mcp.json` so it picks up the server.

### Tools worth using for score work

| Goal | DevTools MCP tool(s) |
| --- | --- |
| Run a Lighthouse audit (same as the CLI) | `lighthouse_audit` |
| **Why is LCP slow** — phase breakdown (TTFB / load delay / render delay) | `performance_start_trace` → `performance_stop_trace` → `performance_analyze_insight` |
| Find render-blocking requests with real timings | `performance_analyze_insight` (RenderBlocking insight) |
| **What's actually loading** — full network waterfall, headers, sizes | `list_network_requests`, `get_network_request` |
| Catch console errors / hydration warnings hurting Best Practices | `list_console_messages` |
| Confirm a fix in the real DOM | `take_snapshot`, `evaluate_script` |
| Test throttled mobile vs desktop | `emulate` (CPU/network/device) |
| Reproduce a flow (nav, click) before measuring | `navigate_page`, `click`, `fill_form`, `wait_for` |

### The 4×100 game plan (per category)

- **Performance** — the trace tools are the unlock. `performance_analyze_insight`
  tells you the LCP phase that dominates and the exact render-blocking requests,
  so fixes target the real bottleneck instead of guesswork. Our known levers:
  render-blocking scripts/CSS, unused JS (code-split with `dynamic()`), the
  experimentation snippet (now a CMS toggle), and TTFB (gated by the CDN
  no-store issue — see `docs/todo-cdn-html-caching.md`).
- **Accessibility** — already 98. `lighthouse_audit` lists the remaining items;
  usually contrast/labels/landmarks. Mostly deterministic fixes.
- **Best Practices** — was 77, dragged down by the experimentation snippet's
  third-party cookie + console issues. `list_console_messages` surfaces the
  inspector issues directly. Some third-party-cookie hits are unavoidable while
  experimentation is on — a real tradeoff, not always a bug.
- **SEO** — already 100. Keep meta description / canonical / robots intact.

### Known un-fixed audit

The `legacy-javascript` audit (~13 KiB of ES polyfills) does **not** clear — it's
an open Next.js bug (vercel/next.js#86785) with no clean fix; see the note in
`next.config.ts`. Not worth fragile webpack hacking for 13 KiB; revisit when the
upstream fix lands.
