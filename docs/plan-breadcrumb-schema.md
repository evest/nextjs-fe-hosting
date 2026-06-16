# Plan: BreadcrumbList structured data (and the visible breadcrumb decision)

**Goal:** Emit `BreadcrumbList` JSON-LD so article (and other deep) pages are
eligible for breadcrumb rich results in Google SERPs, deriving the trail from
the page's ancestors — i.e. "look at the parent page(s) as well."

**Status:** ✅ Implemented (2026-06-16). Decisions below were resolved as:
option (b) visible breadcrumb + JSON-LD; types **ArticlePage, PersonPage,
generic WebPage** (not LandingPageExperience); Home crumb is the **translated
"Home"**; ancestors are resolved by path and **excluded when their SEO block has
`noIndex = true`** (or when the prefix isn't a real page). A trail is only shown
when it has ≥1 real indexable ancestor (length ≥ 3: Home › … › self).

Files: `src/lib/optimizely/get-breadcrumb-trail.ts` (new),
`src/lib/json-ld.ts` (buildBreadcrumbList + ctx.breadcrumbTrail),
`src/app/[locale]/[[...slug]]/page.tsx` (PageBreadcrumbs component),
`messages/*.json` (`Breadcrumbs.home`). Visible UI reuses the existing
`src/components/layout/Breadcrumbs.tsx`. Remaining: deploy to Test2 + validate
with Google Rich Results Test (§7).

---

## 0. Important correction to the premise

The SEO/GEO audit (Opal) said *"the visual breadcrumb exists on the page but
there's no JSON-LD for it."* That is **not accurate for this codebase**:

- [`src/components/layout/Breadcrumbs.tsx`](../src/components/layout/Breadcrumbs.tsx)
  exists and is exported, with `Breadcrumbs` translations in all four
  `messages/*.json` — **but it is never rendered anywhere.** It is dead code.
- What looks breadcrumb-like on the article page is the **category chip**
  (`Content Strategy ›`) in
  [`ArticlePage.tsx`](../src/components/pages/ArticlePage.tsx) — a single
  taxonomy label, not a navigational hierarchy.

Google's guidance: structured data should describe content **visible on the
page**. Shipping `BreadcrumbList` JSON-LD with *no* matching visible breadcrumb
is widely done and usually fine, but it is a manual-action risk and a weaker
signal than a breadcrumb the user can actually see.

**Decision required (see §5):** ship JSON-LD only, or also render the existing
`<Breadcrumbs>` component (it already exists — wiring it in is cheap).

---

## 1. Where the hierarchy comes from

Pages are resolved by URL path:
[`get-page.ts`](../src/lib/optimizely/get-page.ts) calls
`getContentByPath('/' + slug.join('/') + '/')`. So the ancestors of a page are
simply the **prefixes of its slug**:

```
/en/blog/why-b2b-content-drives-growth
  → ancestors:  /en/                      (locale root / home)
                /en/blog/                  (blog listing page)
  → self:       /en/blog/why-b2b-content-drives-growth
```

The breadcrumb trail = `[home, ...each intermediate prefix that resolves to a
real CMS page..., self]`.

Two ways to get each ancestor's **name**:

| Source of name | Pros | Cons |
|---|---|---|
| **A. Resolve each prefix via Graph** (`getContentByPath`) and read `_metadata.displayName` | Accurate, localized, matches the real page title; skips prefixes that aren't real pages | N extra Graph calls per page (N = depth − 1); all cached |
| **B. Humanize the slug segment** (`why-b2b…` → "Why B2B…") | Zero extra fetches | Wrong casing, not localized, can name a folder that isn't a page |

**Recommendation: A**, with B as a per-segment fallback. Depth is small (1–2
intermediate segments in practice), every lookup is `'use cache'`-tagged, and
correctness of the breadcrumb name is the whole point. The user explicitly
asked to "look at the parent page(s)" — that means resolving them, not guessing.

---

## 2. New module: `src/lib/optimizely/get-breadcrumb-trail.ts`

A cached helper that turns a full slug (`[locale, ...segments]`) into an ordered
trail of `{ name, url }`.

```ts
export type BreadcrumbCrumb = { name: string; url: string };

// Resolve a single path to its display name (cached, never throws → null).
// Reuses the same cache discipline as get-page (cacheLife max in prod, tagged).
async function resolvePageName(slug: string[]): Promise<string | null>

// Build the ordered trail for a page slug. Always starts with Home (locale
// root), ends with the current page, and includes every intermediate prefix
// that resolves to a real CMS page. Prefixes that 404 are SKIPPED (a slug
// segment can be a routing convenience with no standalone page, e.g. a folder).
export async function getBreadcrumbTrail(
  fullSlug: string[],            // [locale, ...segments]
  selfName: string,              // page's own display name (already in hand)
  siteUrl: string | null,
): Promise<BreadcrumbCrumb[]>
```

Implementation notes:
- **Reuse `getPageContent`** for prefix resolution rather than a new query —
  same cache key as the page route, so an already-warmed ancestor is a cache
  HIT. Read `_metadata.displayName` (already in the payload).
- **Home crumb name**: pull from `getSiteSettings(locale).siteName` (falls back
  to env `NEXT_PUBLIC_SITE_NAME`), or the translation `Breadcrumbs.home` if we
  want a generic "Home". Prefer siteName for SERP brand value.
- **URL form**: absolute (`siteUrl + path`) to match the canonical/OG URLs
  already emitted. `BreadcrumbList` `item` should be the canonical absolute URL.
- **Skip-on-404 is load-bearing**: `/en/blog/` must resolve to a real listing
  page to appear. If `blog` is only a routing folder with no page, it's omitted
  from the trail (Google tolerates gaps) — or we humanize it as a non-linked
  crumb. Decide per §5.
- **Never throws**: any Graph failure → return the minimal trail
  `[home, self]` so the page still renders.

---

## 3. New builder in `src/lib/json-ld.ts`

Add a `buildBreadcrumbList()` that emits schema.org `BreadcrumbList`:

```ts
function buildBreadcrumbList(trail: BreadcrumbCrumb[]): BreadcrumbList | null {
  if (trail.length < 2) return null;            // a single self-crumb isn't a trail
  return {
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: c.url,                               // omit `item` on the last crumb? see note
    })),
  };
}
```

- `schema-dts` already exports `BreadcrumbList` / `ListItem` — no new dep.
- **Last-item `item`**: Google's current guidance allows the final crumb to
  include or omit `item`; including the self URL is safest and most common.
  Keep it.
- Wire into `buildJsonLd`: push the `BreadcrumbList` into the `@graph`
  **alongside** the existing Article/WebPage/FAQ nodes (same array). It needs
  the resolved trail, so `buildJsonLd`'s signature/`ctx` gains the trail (built
  in the page component and passed in) — keeps `json-ld.ts` free of the extra
  Graph fetches and keeps fetch orchestration in the route.

### Threading the trail in
`buildJsonLd(content, ctx)` is called from `PageJsonLd` in
[`page.tsx`](../src/app/[locale]/[[...slug]]/page.tsx). Add the trail to the
JSON-LD context:

```ts
// in PageJsonLd, before buildJsonLd:
const selfName = readDisplayName(content);     // _metadata.displayName / heading
const trail = await getBreadcrumbTrail(fullSlug(locale, slug), selfName, SITE_URL);
const data = await buildJsonLd(content, { ...ctx, breadcrumbTrail: trail });
```

`PageJsonLd` already has `locale` + `content`; it needs `slug` passed down (it
currently only gets `content`/`locale`/`isLocaleRoot`). Small prop addition.

---

## 4. Scope: which page types get a breadcrumb?

- **ArticlePage** — yes (the audit target; depth ≥ 2).
- **PersonPage** — yes if nested (e.g. `/en/team/jane`); harmless if shallow
  (a 2-crumb Home › Jane is still valid).
- **Locale root / homepage** — **no** (`isLocaleRoot` → skip; a 1-item trail
  isn't a breadcrumb).
- **Generic pages (WebPage)** — yes when depth ≥ 2.

The `trail.length < 2` guard in the builder handles "too shallow → emit
nothing" centrally, so every type can call it safely.

---

## 5. Decisions for you

1. **Visible breadcrumb?**
   - (a) **JSON-LD only** — fastest, but structured data without matching
     visible UI (minor quality risk).
   - (b) **JSON-LD + render `<Breadcrumbs>`** — wire the existing component into
     `ArticlePage` (and others) using the same resolved trail. Strongest signal,
     best UX, reuses code that already exists. **Recommended.**

2. **Ancestor names: resolve (A) vs humanize (B)?** Recommended: **A with B
   fallback** (resolve real pages, humanize only un-resolvable folder segments
   as non-linked crumbs — or skip them entirely).

3. **Folder segments with no page** (e.g. `/blog/` if it's not a real page):
   **skip** (cleaner trail, Google-tolerant) or **show as non-linked label**?
   Need to confirm whether `/en/blog/` resolves to a real listing page — if it
   does (likely, given the article list block exists), this is moot.

4. **Home crumb label**: site name (brand value, recommended) vs generic
   "Home" (`Breadcrumbs.home` translation).

---

## 6. Implementation order (once decided)

1. `getBreadcrumbTrail` helper + `resolvePageName` (cached, never-throws).
2. `buildBreadcrumbList` in `json-ld.ts`; thread `breadcrumbTrail` through
   `JsonLdContext` and `PageJsonLd` (pass `slug` down).
3. (If 5.1b) render `<Breadcrumbs>` in `ArticlePage` from the same trail
   (map `{name,url}` → `{label,href}`; strip the locale prefix for the
   `i18n` `<Link href>`).
4. Verify: deploy to Test2, validate with Google Rich Results Test on
   `…/blog/why-b2b-content-drives-growth`, confirm `BreadcrumbList` parses with
   no errors and the trail reads Home › Blog › Article.
5. Re-run the SEO/GEO audit to confirm the "missing BreadcrumbList" finding
   clears.

---

## 7. Verification checklist

- [ ] `/en/blog/` resolves to a real CMS page (confirms trail completeness).
- [ ] Rich Results Test: `BreadcrumbList` valid, positions 1..N contiguous.
- [ ] Absolute `item` URLs match canonical/OG URLs.
- [ ] Non-default locale (`/no/...`) produces a localized trail with localized
      ancestor names (resolve-by-path returns the locale's displayName).
- [ ] Shallow pages (homepage) emit **no** BreadcrumbList.
- [ ] Graph outage → page still renders (trail degrades to `[home, self]` or
      nothing, never throws).
