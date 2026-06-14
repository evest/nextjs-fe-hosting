# New Build Checklist

A pre-launch checklist for a new website implementation. Each item names **what
to check** and gives enough context to research the fix — but intentionally
**not** the full solution, so the document stays scannable as it grows.

Items are grouped by category. Add new ones under the matching heading; create a
new category if none fits.

> Format per item: a short *what / why* paragraph, then a **Check:** line listing
> the concrete things to verify. Use a `### ` heading per item.
>
> Many items below were distilled from real issues hit during past builds — the
> non-obvious ones a competent dev would otherwise rediscover the hard way.

---

## SEO & Metadata

### Per-page metadata, not inherited defaults
Pages that inherit only a global title/description make every social share and
search snippet look identical. Each page type needs its own title, description,
and Open Graph / Twitter tags driven from content.
**Check:** unique title + meta description per page; a title template at the
root; `metadataBase` set (from the public site URL) so OG image and canonical
URLs resolve absolute, not relative; per-page `openGraph` (title, description,
url, locale, image) and a `twitter` mirror (`summary_large_image`).

### Canonical URLs
Each page should declare a self-referencing absolute canonical, or duplicate-
content and parameterized URLs dilute ranking.
**Check:** canonical emitted on every page; absolute (host included); matches the
page's real URL; depends on a reliable URL field from the CMS payload.

### hreflang / language alternates (multilingual sites)
A multilingual site should tell crawlers about sibling-locale versions of each
page. This needs the *other* locales' URLs, which the default content payload
often doesn't expose — so it's easy to skip silently.
**Check:** `alternates.languages` emitted with each locale's real (localized)
slug; a strategy exists for sourcing sibling-locale URLs (CMS query or explicit
property) rather than guessing them.

### Structured data (JSON-LD) completeness
JSON-LD should reflect what's actually on the page. A common gap: the schema
builder inspects only page-level fields and ignores blocks placed in content
areas (e.g. an FAQ/Accordion block → no `FAQPage`; an author reference not
emitted → no `author` on `Article`/`BlogPosting`).
**Check:** Article/BlogPosting carries `author`, `datePublished`, `publisher`,
`image`; content-area blocks that map to schema (FAQ, HowTo, Breadcrumb) are
traversed and emitted; Organization + WebSite identity present at the site root;
validate at validator.schema.org and Google Rich Results Test.

### sitemap.xml and robots.txt
A sitemap must list every public URL per locale and exclude internal routes;
robots must point to it and disallow preview/diagnostic/webhook paths.
**Check:** sitemap covers all published (locale, slug) pairs, deduped, with
correct `lastmod`; singleton/non-page content excluded; robots disallows
`/preview`, diagnostics, debug, and webhook routes and references the sitemap;
the sitemap is revalidated on publish, not only on a long timer.

### noindex respected everywhere it should be
An editor "hide from search" toggle must actually suppress the page from
crawlers *and* from any LLM/index feeds the site emits.
**Check:** `noIndex` emits `robots` meta correctly; the same flag gates inclusion
in sitemap and any `llms.txt`-style index.

### LLM / GEO discoverability (optional but increasingly relevant)
AI crawlers benefit from a machine-readable index of the site's content. If the
project emits an `llms.txt` (or similar), verify it isn't silently empty.
**Check:** the index route actually returns content (a misconfigured data client
in a standalone route handler can throw and yield an empty file); locale-agnostic
root entry uses a sensible default language; respects `noIndex`.

## Performance & Images

### Image serving via CDN (resize, format, clamp)
Images should be resized and format-optimized at the CDN edge rather than the
app origin, and each CDN has its own URL contract and limits (path-prefix vs
query-string params, which of width/height/quality/format are supported, whether
it clamps to the source). Verify the responsive `srcSet` actually returns
different byte sizes per width — if every width returns the same bytes, the CDN
is ignoring the resize and serving the original.
**Check:** srcSet widths return distinct byte sizes; modern formats (AVIF/WebP)
negotiated where the CDN supports it; an upper width clamp on CDNs that don't cap
to the source (so a tiny element can't request a multi-MB original); the bare
`src` fallback isn't the full-resolution original; the chosen image framework
(e.g. `next/image`) routes through the CDN, not a single-region origin optimizer.

### LCP image priority and `sizes`
The largest above-the-fold image (hero/featured) must load eagerly and request a
correctly sized candidate, or mobile LCP suffers. A `sizes`-less responsive image
can ship a desktop-width file to a phone.
**Check:** LCP image has `priority`/eager loading (emits `fetchpriority=high` +
preload); every responsive image has a `sizes` attribute matching its layout;
below-the-fold images stay lazy.

### Layout shift (CLS) from streamed/suspended content
When dynamic content streams into a prerendered shell, a `Suspense` boundary with
no height-reserving fallback lets the footer (and other shell elements) paint high
and then jump down when content arrives — large CLS, and it can invalidate an
early LCP. The Suspense itself may be load-bearing (required for streaming/PPR),
so the fix is a sized fallback, not removing it.
**Check:** suspense fallbacks reserve realistic height (e.g. min viewport height
for a page body); measure CLS on mobile; confirm no late-arriving element shoves
layout.

### Web font loading
A render-blocking webfont delays first paint of text (often the LCP element on
text-heavy pages).
**Check:** `font-display: swap` (or equivalent) so text paints in a fallback
immediately; critical fonts preloaded; self-hosted or on a fast origin.

### Static asset cache headers
Hashed/immutable public assets (logos, icons, fonts) served with a short TTL get
re-fetched on every visit.
**Check:** long-lived `Cache-Control: public, max-age=31536000, immutable` on
fingerprinted/stable static assets; a content-changing asset gets a new filename
(or a shortened TTL) so the immutable cache doesn't serve a stale version.

### Lighthouse measurement methodology (don't chase noise)
Lighthouse scores are noisy and some audits flap. Treating a single run as truth
leads to chasing phantom regressions and phantom failures. Two specific traps
seen in practice: (1) Performance/LCP swing several points across identical runs
on the same deployed code — network/origin/throttling jitter, not a real change;
(2) deterministic-looking audits flap — e.g. `meta-description` reported missing
on one run while the tag is provably in the HTML on every fetch (a streaming /
timing false-negative). Also: measure the **deployed** environment with
production-like caching, not local dev, and run **incognito** (extensions skew
results).
**Check:** take the **median of 3–5 runs**, not one; report a *range* not a point;
before "fixing" a failing audit, verify the underlying fact directly (e.g. `curl`
the HTML for the meta tag) — a flaky audit needs no code change; store results
over time so a real trend is distinguishable from jitter; measure against the
deployed (cached) URL.

### Modern JS baseline
A too-old browserslist target ships a large legacy-polyfill bundle to modern
browsers for no benefit. Caveat: the framework may inject polyfills
*independent of* browserslist — Next.js ships a `polyfill-nomodule` bundle
(~13 KiB of `Array.prototype.at`, `Object.hasOwn`, etc.) unconditionally, so a
modern browserslist floor alone does **not** clear the Lighthouse
`legacy-javascript` audit (see vercel/next.js#86785). The commonly-cited
`resolve.alias` of `polyfill-module` is a no-op (wrong module). Don't sink time
into fragile webpack-internals workarounds for a small payload — confirm whether
it's an open framework bug first and track it.
**Check:** a modern browserslist floor is set; audit for a legacy-JavaScript
bundle (Lighthouse flags it); if it persists despite a modern floor, verify
whether it's a framework-level unconditional polyfill (open bug) before
attempting a workaround; verify any "fix" against the deployed Lighthouse audit,
not a local bundle grep (can't distinguish polyfill-install from app code).

## Accessibility

### Brand-color contrast on small text (WCAG AA)
Brand accent colors are tuned to look good, not to pass contrast — a vivid logo
color used for small text on white commonly fails WCAG AA (needs **4.5:1** for
normal text; large text ≥24px or ≥18.66px-bold only needs 3:1). Eyebrows/labels,
muted metadata (date, byline), and link colors are the usual offenders. The fix
shouldn't mute the brand everywhere: add a darker **accessible variant** of the
brand color scoped to small-text-on-light uses, and keep the vivid brand for
large display text and non-text decoration. Make it background-aware — the
accessible (darkened) value is *worse* on dark surfaces, so revert it to the
vivid brand there.
**Check:** run the Lighthouse/axe `color-contrast` audit; small text on light
backgrounds hits 4.5:1; large display text hits 3:1; brand color isn't muted
globally to fix one element (use a scoped token); the accessible variant adapts
per surface (light vs dark/image) rather than one value everywhere.

## PWA & Manifest

### Web app manifest — icon purposes
The `site.webmanifest` icons must be usable as general-purpose icons, not
`maskable`-only. A maskable-only icon is reserved for the adaptive/masked
context, so Chrome's home-screen / install selection ignores it and Android
reports the favicon as "not set" even when a 192×192 icon exists and is listed
in the manifest.
**Check:** every manifest icon's `purpose` (use `any` or `any maskable`, not
`maskable` alone); a 192×192 and 512×512 are present with correct `sizes`/`type`;
the icon PNGs resolve (HTTP 200) on the deployed host; the manifest is served as
`application/manifest+json`.

### Complete favicon / icon set
Browsers and platforms each want a different icon form; a single `favicon.ico`
leaves gaps (Safari tab, iOS home screen, etc.).
**Check:** ICO, SVG, a PNG (e.g. 96×96), an Apple touch icon (180×180), and the
manifest PNGs (192/512) all present and wired into the document head + manifest.

## Caching, ISR & Revalidation

### Shared cache across replicas
With multiple server replicas behind a load balancer, an in-process cache desyncs
— one replica serves stale, another fresh, and a revalidation only clears the
replica that handled it.
**Check:** a shared cache backend (e.g. Redis) is the single source of truth;
the in-process LRU is disabled so it can't reintroduce desync; cache keys are
namespaced per deployment slot so blue/green deploys don't collide.

### Cache serialization round-trips (Buffer/binary bodies)
A cache handler that JSON-stringifies entries can corrupt non-string bodies —
binary/`Buffer` route responses (sitemap, robots, text indexes, optimized images)
come back as `[object Object]` or garbled. This often reproduces only in
production (the real cache backend), not in a local in-memory fallback.
**Check:** the cache handler round-trips `Buffer`/binary bodies losslessly
(base64 or equivalent); test the actual production cache path, not just local dev;
fetch binary/text routes after a cache write and confirm bytes are intact.

### On-demand revalidation actually reaches the content
A publish webhook that revalidates by path won't invalidate content embedded via
a *different* mechanism (a referenced entity rendered inside another page, a
listing derived from many pages). Path-only invalidation leaves those stale.
**Check:** revalidation covers tags as well as paths; embedded/referenced content
(author cards, related lists) is tagged and invalidated; listing pages are
invalidated for every ancestor path-prefix of a published URL; webhook is
authenticated and returns 200 even on downstream failure so it isn't retried into
a storm.

### Edge HTML caching vs. RSC requests
Putting a CDN HTML cache in front of an app-router site requires excluding the
framework's data/navigation requests (RSC payloads) from that cache, or soft
navigations serve the wrong document. Also, the origin must send cache-allowing
headers or the edge bypasses entirely.
**Check:** the CDN caches full HTML documents but bypasses RSC/router requests;
origin emits shareable cache headers (not `no-store`) for cacheable routes; an
edge/browser TTL split (long shared TTL, short browser TTL) so a publish-purge is
honored quickly; verify `cf-cache-status`/equivalent shows HIT, not DYNAMIC.

### Why the origin emits `no-store` — it's the render mode, not middleware
When a route serves `Cache-Control: private, no-store`, the cause is almost
always that the framework classifies it as **dynamic** (rendered per-request) —
Next.js sets `Cache-Control` purely by render mode (static → `s-maxage=1y`,
ISR → `s-maxage`+`swr`, dynamic → `no-store`). Easy false leads that waste time:
blaming the i18n cookie, blaming the middleware running, or trying to override
`Cache-Control` *in* middleware (the framework overwrites it for dynamic pages).
A common reason a CMS catch-all is dynamic: `generateStaticParams` returns a
placeholder (not real paths), so nothing prerenders and every page is on-demand.
Note the tradeoff — on-demand-then-cache scales to large sites (one-time penalty
per visited page); prerendering all CMS paths gives cacheable headers but a
build cost that grows with content. Prerendering is *not* automatically the right
answer for a large site.
**Check:** confirm the route's render mode in the build output (static `○` /
PPR `◐` / dynamic `ƒ`) before chasing the header; verify with a controlled test
(does the header change when the suspected cause is removed?) rather than
assuming; decide the prerender-vs-on-demand tradeoff against the *expected* page
count, not the current one; a per-user `Set-Cookie` (e.g. an i18n locale cookie)
also blocks shared caching — drop it if locale is URL-derived and unread.

### CDN purge targets the public hostname
A publish-time CDN purge must target the hostname the CDN actually fronts. If it
purges an internal/origin hostname the CDN has never seen, the purge silently
no-ops and stale pages persist at the edge.
**Check:** the purge URL uses the public hostname, not an internal platform one;
confirm with a real publish → edge re-fetch.

### Local dev can't receive publish webhooks
A webhook-driven cache invalidation can't reach `localhost`, so an aggressive
("max"/indefinite) cache life freezes CMS edits in local dev — they never appear.
**Check:** dev uses a short cache life (so edits show) while prod uses the long,
webhook-purged one; this split is environment-gated, not hardcoded.

## Routing, Status Codes & i18n

### Correct 404 status for unknown URLs
Rendering a not-found UI with a 200 status (instead of a real 404) is a
correctness bug — and under a CDN/ISR setup it can cache the not-found page for
every typo'd URL anyone tries, for the full cache window.
**Check:** unknown URLs return HTTP 404 (use the framework's `notFound()`, not
just rendered text); the 404 status is committed before any streaming/Suspense
boundary so it isn't swapped to 200; a typo'd URL isn't cached as a 200.

### Locale routing and URL strategy
Multilingual routing needs a consistent, unambiguous URL scheme and must preserve
the current path when switching languages.
**Check:** a defined prefix strategy (e.g. always-prefixed `/{locale}/...`); the
default-locale redirect works; a locale switcher swaps locale while keeping the
current page (handles localized/dynamic slugs); `<html lang>` reflects the active
locale (note: reading locale in a root layout can conflict with static
prerendering — verify the build still prerenders).

### Localized fields actually localized
Editor-facing fields that should be translatable must be marked localized in the
content model, or per-locale translations are silently dropped and the default
language leaks onto translated pages. Nested/array item fields are an easy miss.
**Check:** every user-visible text field intended for translation is localized,
including fields on nested/array sub-items (FAQ items, card lists); spot-check a
translated page for default-language leakage.

## Security & Headers

### Unauthenticated internal/diagnostic routes
Debug, diagnostics, and preview helper routes that expose env vars, queries, or
internal state must not be publicly reachable in production.
**Check:** debug/diagnostics endpoints are gated (auth or removed) before public
launch; secrets are masked in any debug output; these routes are disallowed in
robots and ideally blocked at the edge.

### Webhook authentication
Inbound webhooks (publish, form, payment) must verify a shared secret/signature
before acting.
**Check:** webhook validates an API key/signature header and rejects (401)
otherwise; rejects don't leak why; endpoint is rate-limit/abuse considered.

### Secrets not logged
Env-var values printed at build/prerender time leak into build logs and stdout.
**Check:** no `console.log` of env values on prerender/startup; sensitive values
only available via a gated endpoint, masked.

## Analytics & Third-Party Scripts

### Experimentation / anti-flicker snippets load correctly
A/B-testing snippets that need to run before first paint must be synchronous in
the head; deferring them causes flicker. But they also bring real costs to weigh:
the snippet is typically the single biggest render-blocking request *and* sets a
third-party cookie that tanks the Best-Practices score — measure with it on vs.
off so the tradeoff is explicit (it can hide a non-trivial FCP/Best-Practices
hit). Prefer making it a **runtime toggle** (a CMS/settings flag) rather than a
build-time env var, so it can be flipped without a redeploy. If a toggle has both
a CMS value and an env fallback, beware: a stale env fallback can make it
impossible to turn off via the CMS — pick a single source of truth.
**Check:** anti-flicker snippet is the synchronous, parser-blocking form it
requires (not a deferred loader); runtime-toggleable (and toggling off has a
single authoritative source — no env fallback silently overriding the CMS off);
measure FCP/LCP/Best-Practices with it on and off; third-party cookie / SameSite
warnings reviewed; targeting (e.g. excluding preview) configured in the product,
not the page; a settings change that affects every page clears the whole cache.

## CMS & Content Modeling

### Reserved property names
CMS platforms reserve certain property names; using one causes confusing schema
or runtime failures.
**Check:** content-type property keys avoid reserved names (and reserved
property-*group* names); validate against the platform's reserved list when
modeling.

### URL-typed and reference property shapes
Link/URL and content-reference properties don't return plain strings — reading
them naively renders `[object Object]` as an href or yields no image URL. DAM and
managed-asset references can also arrive in different shapes.
**Check:** URL properties read their actual address field (not stringified);
image references handle both managed-asset and DAM shapes; use the SDK's URL/image
helpers rather than manual field access.

### No viewport-height units in CMS-previewed content
A CMS preview renders the page inside an iframe and auto-sizes that iframe to its
content height. Any viewport-height unit (`min-height: 100vh`, or Tailwind's
`min-h-screen` / `min-h-svh` / `min-h-dvh`) resolves against the *iframe's*
height — so the CMS grows the iframe → `100vh` grows → the element grows → the
iframe grows again: a runaway vertical-growth feedback loop. Easy to hit in
error/empty/fallback states that reach for a full-height background.
**Check:** error, empty, and fallback states rendered in the preview frame size
to their content, not the viewport; no `vh`/`svh`/`dvh` min-heights (or
`min-h-screen`) on elements that can render inside the preview iframe; full-height
viewport sizing is confined to the real top-level page shell.

### Editor experience: descriptions, field order, singletons
Editors fill in what they understand. Missing descriptions, random field order,
and invisible singleton settings produce bad content.
**Check:** content types and key properties have descriptions; fields ordered
deliberately (sortOrder/groups); singleton/settings content has an editor-visible
reference view rather than a 404 or bare form.

## Build & Deploy

### Build resilience when backend is slow/unreachable
If the build pre-renders pages by querying the CMS, a slow or unreachable backend
in the build container can fail the build (or, worse, 404 a real page until the
next publish). Build-time backend latency is a real, observed failure mode on
hosted platforms.
**Check:** the build tolerates an unreachable/slow data backend (timeout +
fallback) rather than hanging or failing; pages can be served via ISR on first
request instead of requiring build-time prerender; if the framework requires at
least one static param, a placeholder satisfies it without hitting the backend;
verify by building with the backend pointed at an unreachable address.

### Runtime/platform version pinning
Loose engine ranges and "latest" tool versions let a host run an unsupported
runtime or pull a breaking CLI mid-stream.
**Check:** `engines.node` matches the framework's real minimum; build/CMS CLI
tools pinned to known-good versions; package manager pinned (mixing npm/pnpm/yarn
can corrupt native binaries on some platforms); a lockfile is committed.

### First-deploy provisioning settling
On some platforms, supporting infrastructure (managed identity, cache backend
access, role propagation) provisions on the *first* deploy and takes minutes to
settle — the first deploy logs auth/connection errors that clear on a redeploy.
**Check:** know whether the platform has this behavior; don't treat first-deploy
infra errors as a broken integration; document "wait and redeploy" expectations
for the team.
