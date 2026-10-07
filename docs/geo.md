# GEO: making the site readable for search engines and AI

GEO (Generative Engine Optimisation) and AEO (Answer Engine Optimisation) are
about being understood and cited by AI-powered search — ChatGPT, Perplexity,
Google's AI Overviews — not just ranked by classic search. In practice, that
comes down to giving machines clean, explicit signals about what each page is,
who wrote it, and how it relates to the rest of the site.

This page describes the signals this site emits, where each one comes from in
the CMS, and the trade-offs we made. Every signal is driven by content fields,
so editors control it without a deploy.

| Signal | Where | Driven by |
|---|---|---|
| `llms.txt` / `llms-full.txt` | `/llms.txt`, `/{locale}/llms.txt`, and `-full` variants | Article, person and landing pages in Graph |
| JSON-LD structured data | Every CMS page | Content fields + the SEO block + Site Settings |
| Meta, Open Graph, Twitter | Every CMS page | The SEO block, with fallbacks to content fields |
| Canonical + `hreflang` | Every CMS page | URL from Graph; locale alternates from the router |
| `sitemap.xml` | `/sitemap.xml` | Every published page in Graph |
| `robots.txt` | `/robots.txt` | Code |

## llms.txt

[`llms.txt`](https://llmstxt.org/) is a proposed convention: a markdown file at
the site root that gives LLMs a curated index of the site, instead of making
them crawl and parse HTML. The site serves four variants:

- **`/llms.txt`** — every locale, grouped by language.
- **`/{locale}/llms.txt`** — one language (e.g. [`/en/llms.txt`](https://test.contentgurus.no/en/llms.txt)).
- **`/llms-full.txt`** and **`/{locale}/llms-full.txt`** — the same index with
  the full body of every article and person page converted to markdown
  (about 100 KB for English), so an LLM can read the content without
  fetching each page.

Each entry links to the page and uses its meta description:

```markdown
# Content Gurus

> Content Gurus is a content marketing agency specialising in content
> strategy, SEO, and Generative Engine Optimisation (GEO). …

### Articles
- [Technical SEO Checklist for GEO and AEO](https://test.contentgurus.no/en/blog/technical-seo-checklist-geo-aeo): A 22-point technical SEO checklist …
```

How it works:

- One Graph query fetches `ArticlePage`, `PersonPage` and
  `LandingPageExperience` for all locales
  ([`get-llms-index.ts`](../src/lib/optimizely/get-llms-index.ts)). The intro
  paragraph is the *LLM index description* field on Site Settings.
- **`noIndex` on a page's SEO block hides it from both search engines and the
  LLM indexes.** One flag, one meaning: "don't surface this".
- Rich text is stored as JSON in Graph and converted to markdown for the
  `-full` variants.
- The index is cached indefinitely and tagged; the publish webhook
  revalidates the tag on every publish, so the files are always current but
  cost one Graph query per publish instead of one per request. See
  [caching](caching.md).

## Structured data (JSON-LD)

Every CMS page emits JSON-LD built in
[`src/lib/json-ld.ts`](../src/lib/json-ld.ts), typed with
[`schema-dts`](https://github.com/google/schema-dts) so invalid shapes fail
the build rather than the validator.

**Default types per content type:**

| Page | Primary node | Also emitted |
|---|---|---|
| Article | `Article` (or the editor's choice, e.g. `BlogPosting`) | Author `Person` with `sameAs` profile links, publisher `Organization` |
| Person | `ProfilePage` with a `Person` as main entity | — |
| Landing page / other | `WebPage` | — |

On top of that, every page gets a `BreadcrumbList` (except the locale roots),
a `FAQPage` if it contains accordion blocks, and the locale roots (e.g. `/en`)
also get `Organization` and `WebSite`.

A trimmed example from an article:

```json
{
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "headline": "Technical SEO Checklist for GEO and AEO",
  "description": "A 22-point technical SEO checklist for GEO and AEO: …",
  "datePublished": "2026-06-25T10:56:36.550Z",
  "dateModified": "2026-10-07T13:10:58.766Z",
  "inLanguage": "en",
  "mainEntityOfPage": "https://test.contentgurus.no/en/blog/technical-seo-checklist-geo-aeo",
  "articleSection": "seo",
  "publisher": { "@type": "Organization", "name": "Content Gurus", "logo": { "@type": "ImageObject", "url": "…" } }
}
```

**The author is a real entity.** An article's author is a reference to a
Person page, not a text field. The JSON-LD resolves it into a `Person` with
job title, image and `sameAs` links to LinkedIn, X and other profiles — the
kind of E-E-A-T signal AI engines use to judge who stands behind a claim.

**FAQ markup comes from content.** Accordion blocks on a page are collected
into a single `FAQPage`, one `Question`/`Answer` per accordion item. Editors
build an FAQ section visually; the structured data follows.

**Organization and WebSite come from Site Settings**, a singleton content item
with the legal name, description, logo, contact email and phone, address and
`sameAs` profile URLs. Publishing Site Settings revalidates every page.

### Editor overrides: the SEO block

Every page and experience has an *SEO Settings* block
([`SeoBlock.ts`](../src/content-types/SeoBlock.ts)). Besides the usual meta
title, description, Open Graph image, `noIndex` and `noFollow`, it has a
*Schema* tab for GEO-specific fields:

| Field | Effect |
|---|---|
| Schema type | Overrides the primary `@type` — 20 options (BlogPosting, Service, Event, HowTo, FAQPage, …) |
| Keywords | `<meta name="keywords">` and JSON-LD `keywords` |
| About — topics | One per line → JSON-LD `about` entries, helping AI disambiguate the subject |
| Speakable CSS selectors | A `SpeakableSpecification` marking content suitable for voice assistants |
| Published / modified date override | For backdated imports, where the CMS publish date isn't the real one |
| Custom JSON-LD | Fully replaces the generated JSON-LD for that page and locale (invalid JSON is logged and ignored) |

Meta title, description, keywords, topics and custom JSON-LD are localized, so
each language gets its own values.

### Filling it in with Optimizely Mark

Many fields per page per locale is a lot to fill in by hand. The content team
uses Optimizely Mark (previously Opal) to draft meta descriptions, keywords,
topics and other schema fields from the page content, then reviews them in the
CMS. The code only defines the fields; the quality of the signals comes from
the content in them.

## Meta tags, canonical URLs and hreflang

- **Title and description** come from the SEO block's meta title and
  description, falling back to the site defaults.
- **Open Graph and Twitter cards** use the SEO block's image, falling back to
  the page's main image (an article's featured image, a person's photo, a
  landing page's background). Images are cropped to 1200×630 at the image
  CDN, so editors can upload any size.
- **Canonical URLs** are absolute, built from the page's URL in Graph.
- **`hreflang` alternates** for every locale plus `x-default` are sent as an
  HTTP `Link` header by the [next-intl](https://next-intl.dev/) middleware,
  not as `<link>` tags.

## Sitemap and robots.txt

- [`/sitemap.xml`](https://test.contentgurus.no/sitemap.xml) lists every
  locale root and every published page, with the publish date as
  `lastModified`. It is cached for an hour and also revalidated on publish.
- [`/robots.txt`](https://test.contentgurus.no/robots.txt) allows all crawlers,
  AI crawlers included, and only blocks preview, webhook and diagnostic routes.
  For a site whose goal is to be cited, blocking AI crawlers would defeat the
  purpose.

## Known limitations

- **`<html lang>` is always `en`.** Reading the locale in the root layout is a
  request-time read, which breaks Partial Prerendering under Cache Components.
  The language is still declared correctly in JSON-LD (`inLanguage`),
  `og:locale` and `hreflang`. The proper fix is a root layout per locale; see
  [html lang and cacheComponents](html-lang-and-cachecomponents.md).
- **Graph's `limit` maximum is 100**, so each content type in the LLM index is
  capped at 100 items per query. Fine for this site; a larger site would need
  paging.

## Key files

| File | Purpose |
|---|---|
| [`src/lib/json-ld.ts`](../src/lib/json-ld.ts) | Builds all JSON-LD |
| [`src/lib/schema-types.ts`](../src/lib/schema-types.ts) | The schema type list shown to editors |
| [`src/content-types/SeoBlock.ts`](../src/content-types/SeoBlock.ts) | SEO and schema fields |
| [`src/content-types/SiteSettings.ts`](../src/content-types/SiteSettings.ts) | Organization, WebSite and LLM index inputs |
| [`src/lib/optimizely/get-llms-index.ts`](../src/lib/optimizely/get-llms-index.ts) | Data for `llms.txt` |
| [`src/app/llms.txt/`](../src/app/llms.txt/), [`src/app/[locale]/llms.txt/`](../src/app/%5Blocale%5D/llms.txt/) | The `llms.txt` routes |
| [`src/app/sitemap.ts`](../src/app/sitemap.ts), [`src/app/robots.ts`](../src/app/robots.ts) | Sitemap and robots |
