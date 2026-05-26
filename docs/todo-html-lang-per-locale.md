# TODO — Per-locale `<html lang>` via route groups (Option A)

**Status:** planned — to be done after the demo on 2026-05-27.
**Owner:** Steve.
**Related:** [`html-lang-and-cachecomponents.md`](./html-lang-and-cachecomponents.md) for the *why*.

---

## Current state (interim hybrid)

`src/app/layout.tsx` hard-codes `<html lang="en">`. The visible page content
still renders in the correct language via `next-intl` (`useTranslations()`,
locale-aware date formatting, etc.) — but the document-level `lang`
attribute is wrong on `/no`, `/sv`, `/da`.

This was chosen as a one-line stopgap because the proper fix needed more
restructuring than the demo timeline allowed. See the linked "why" doc
for the full reasoning.

## Why this needs to change

- **Screen readers** pick the wrong voice/pronunciation profile for
  Norwegian/Swedish/Danish content. Accessibility regression vs. a vanilla
  next-intl setup without `cacheComponents`.
- **Search engines** use `<html lang>` as one signal for content language
  detection. With everything served as `lang="en"`, Google may
  occasionally classify Norwegian/Swedish/Danish pages as English, hurting
  ranking in the right local search market.
- **Browser features** (translate prompts, font fallbacks, hyphenation
  dictionaries) all key off `<html lang>`.

It's a quality-of-implementation issue, not a correctness bug — the page
*works* in every locale today. But this is the kind of detail Nordic
clients notice.

---

## The target architecture (Option A)

Split the `app/` directory into top-level route groups, each with its own
root layout that renders its own `<html>` tag. With no top-level
`app/layout.tsx`, each group becomes a separate "root" and Next.js picks
which one wraps the active route.

```
src/app/
├── (site)/                    ← user-facing
│   └── [locale]/
│       ├── layout.tsx         ← renders <html lang={locale}>, fonts, snippet, metadata
│       ├── [[...slug]]/
│       │   └── page.tsx
│       ├── llms.txt/
│       ├── llms-full.txt/
│       └── not-found.tsx
├── (preview)/                 ← editor route (locale comes from ?loc=)
│   └── preview/
│       ├── layout.tsx         ← renders <html lang={locFromSearchParams}>
│       └── page.tsx
├── (internal)/                ← non-localised admin/dev routes
│   ├── layout.tsx             ← renders <html lang="en">
│   ├── diagnostics/
│   ├── debug/
│   └── (no public traffic — fine to be "en")
├── globals.css
├── favicon.ico               ← magic file, lives at app root (or move to public/)
├── robots.ts                  ← route handlers — no <html>, no layout needed
├── sitemap.ts
└── hooks/graph/route.ts
```

Key constraint to remember: **only the file at the route group's root
can render `<html>`**. Inside `(site)/`, the topmost layout is
`[locale]/layout.tsx` because there's no `(site)/layout.tsx` above it
— that's deliberate, because only `[locale]/` has access to
`params.locale`, which is a *static input* (cacheable, doesn't trigger
the uncached-read error).

---

## Migration steps

### 1. Inventory what the current root layout owns

Today `src/app/layout.tsx` is responsible for:

- Loading 4 fonts (`Geist`, `Geist_Mono`, `Instrument_Serif`, `Manrope`)
  and applying their CSS variables to `<body>`.
- Rendering the Optimizely Web Experimentation snippet (synchronous,
  parser-blocking, in `<head>`).
- Exporting `metadata` (title template, `metadataBase`, `openGraph`
  defaults, `twitter` card, icons, manifest).
- Wrapping `{children}` in `<body class="… min-h-screen flex flex-col">`.

All of this needs to land in *every* new root layout (`(site)/[locale]`,
`(preview)/preview`, `(internal)`). The fonts and snippet should be
extracted into helpers/components to avoid drift:

- `src/lib/fonts.ts` → exports the 4 font instances and a combined
  `className` string. Each new root layout imports and applies it.
- `src/components/layout/OptimizelyWebExpSnippet.tsx` → server component
  that renders the `<script>` tag. Each new root layout drops it into
  `<head>`.
- `src/lib/site-metadata.ts` → exports the `metadata` object so each
  root layout can `export const metadata = baseMetadata;` (or spread
  and override).

### 2. Create the route groups

```
mkdir src/app/(site) src/app/(preview) src/app/(internal)
```

Move existing directories:

```
git mv src/app/[locale]      src/app/(site)/[locale]
git mv src/app/preview       src/app/(preview)/preview
git mv src/app/diagnostics   src/app/(internal)/diagnostics
git mv src/app/debug         src/app/(internal)/debug
```

Leave at `src/app/` root:

- `globals.css`, `favicon.ico`, `robots.ts`, `sitemap.ts`,
  `llms.txt/route.ts`, `llms-full.txt/route.ts`, `hooks/graph/route.ts`,
  `page.tsx` (the `/` redirect).
- Route handlers (`route.ts`) and the `MetadataRoute` files don't need a
  layout — they don't render HTML.
- `app/page.tsx` redirects to `/no` immediately and doesn't render HTML
  either; it can stay at the root with no layout.

### 3. Delete `src/app/layout.tsx`

Once the new group layouts exist, the old root must go — Next.js
prohibits having an `app/layout.tsx` *and* group layouts at the same
time. The build will fail with a clear error if both exist.

### 4. Create `src/app/(site)/[locale]/layout.tsx`

```tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { Header, Footer, SkipLink } from "@/components/layout";
import { OptimizelyWebExpSnippet } from "@/components/layout/OptimizelyWebExpSnippet";
import { routing } from "@/i18n/routing";
import { fonts } from "@/lib/fonts";
import { siteMetadata } from "@/lib/site-metadata";
import "../../globals.css";
import "@/optimizely";

export const metadata: Metadata = siteMetadata;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleRootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <OptimizelyWebExpSnippet />
      </head>
      <body className={`${fonts.className} antialiased min-h-screen flex flex-col`}>
        <NextIntlClientProvider>
          <SkipLink />
          <Header />
          <main id="main-content" className="flex-1">{children}</main>
          <Footer />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
```

Note: this absorbs the *current* `src/app/[locale]/layout.tsx` (Header,
Footer, NextIntlClientProvider, SkipLink). After the move, the old
`(site)/[locale]/layout.tsx` shouldn't exist as a separate file — its
contents merge into the new root layout above.

### 5. Create `src/app/(preview)/preview/layout.tsx`

Preview gets its locale from the `?loc=` searchParam, not `params`. The
locale can't be read in the layout (searchParams aren't available to
layouts), so this layout has to hard-code something — best bet is `en`,
since editors usually have the CMS UI in English and the preview body
already does its own `NextIntlClientProvider`.

If `lang` correctness in preview matters, we can use a client-side
script to update `document.documentElement.lang` after read. But for
editor-only content, it's low priority.

```tsx
import { fonts } from "@/lib/fonts";
import { OptimizelyWebExpSnippet } from "@/components/layout/OptimizelyWebExpSnippet";
import "../../globals.css";
import "@/optimizely";

export default function PreviewRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <OptimizelyWebExpSnippet />
      </head>
      <body className={`${fonts.className} antialiased min-h-screen flex flex-col`}>
        {children}
      </body>
    </html>
  );
}
```

### 6. Create `src/app/(internal)/layout.tsx`

```tsx
import { fonts } from "@/lib/fonts";
import "../globals.css";
import "@/optimizely";  // diagnostics page uses the SDK registry

export default function InternalRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${fonts.className} antialiased min-h-screen flex flex-col`}>
        {children}
      </body>
    </html>
  );
}
```

No Header/Footer here — diagnostics/debug pages are dev tooling.

### 7. Verify the build

```
npm run build
```

Expected: 22 static pages still generate (the prerender error is gone
because we never read uncached data in any root layout). Each locale
gets its own prerendered shell with the right `<html lang>`.

Spot-check the output:

```
curl -s https://localhost:3000/no | grep '<html'   # → lang="no"
curl -s https://localhost:3000/en | grep '<html'   # → lang="en"
curl -s https://localhost:3000/diagnostics | grep '<html'   # → lang="en"
```

### 8. Verify cacheComponents PPR still works

Look for the legend in the build output:

```
○  (Static)             prerendered as static content
◐  (Partial Prerender)  prerendered as static HTML with dynamic server-streamed content
ƒ  (Dynamic)            server-rendered on demand
```

`[locale]/[[...slug]]` should remain `○` or `◐`, *not* `ƒ`. If it
flipped to `ƒ`, something in the new locale layout is doing an uncached
read (most likely a leaked `headers()` or `getLocale()` call) and needs
to be fixed.

### 9. Update the "why" doc

After the migration lands, `docs/html-lang-and-cachecomponents.md` should
be updated with a "Resolution" section noting the date this was done and
linking to the merge commit. Future readers should be able to see this
was a known temporary state.

---

## Edge cases to watch

- **The `/` redirect**: `app/page.tsx` currently redirects `/` → `/no`.
  This file has no layout (it's a route handler-style server component
  that calls `redirect()` and returns nothing). It should keep working
  with no `app/layout.tsx` because nothing renders HTML.
- **`favicon.ico` magic file**: works regardless of layout structure.
  Currently in `public/`; not in `app/` after the favicon work.
- **`not-found.tsx`**: there's one inside `[locale]/` today. It moves
  with the directory. The root-level `not-found` (if needed for
  non-localised 404s) would land in `(internal)/`.
- **CSS imports**: `globals.css` is currently imported once in
  `app/layout.tsx`. After the split, each new root layout must import
  it. Tailwind will still produce a single CSS bundle — Next dedupes.
- **`import "@/optimizely"`**: this side-effect-only import registers
  CMS content types and React components. It needs to run on every
  route that renders CMS content, so each root layout must include it
  (or it could move into a shared barrel).
- **Tests**: there are no automated tests today, so no test fixtures to
  update. Manual smoke test after the migration: load `/no`, `/en`,
  `/sv`, `/da`, `/diagnostics`, `/preview?…`, view-source on each.

---

## Estimated effort

- Refactor: ~1 hour (mechanical moves + extracting font/snippet helpers).
- Verification: ~30 min (build, lint, smoke-test every route group).
- Doc updates: ~15 min.

Total: roughly half a day, including testing on the test environment.
