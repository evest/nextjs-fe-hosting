# Why `<html lang>` is hard-coded in the root layout

**Short answer:** Next.js 16's `cacheComponents` (PPR) forbids uncached
request reads in the static shell. Reading the per-request locale in the
root layout — the most natural way to set `<html lang>` — is exactly
such a read, and it crashes the build with a `blocking-route` error
during static prerendering. We hard-coded `lang="en"` as a stopgap.

This isn't a Content Gurus problem. The Next/App Router community has
been arguing about this exact trade-off for years — see the canonical
discussion: <https://github.com/vercel/next.js/discussions/49415>.

This doc explains what's going on, why every other workaround we
considered is worse, and where we're going next (see the migration
plan: [`todo-html-lang-per-locale.md`](./todo-html-lang-per-locale.md)).

---

## The constraint

Next.js App Router has two structural rules that combine badly here:

1. **Only the root layout can render `<html>` and `<body>`.** Nested
   layouts compose into the root's `<body>`. So setting `lang` on
   `<html>` from a deeper layout is impossible without breaking out
   into a separate route group with its own root.

2. **The root layout sits above the dynamic route segments**, so it has
   no access to `params.locale`. The locale only becomes available
   inside `[locale]/...`, which is one level deeper than `<html>`.

The natural bridge — read the locale via `next-intl`'s `getLocale()` or
via `headers()` directly in the root layout — works in vanilla Next.js
but breaks under `cacheComponents`.

## What `cacheComponents` adds

`cacheComponents: true` (set in `next.config.ts`) opts the entire app
into Partial Prerendering (PPR). Under PPR, every route is split into:

- A **static shell** that gets prerendered at build time and cached at
  the edge. This is what users see first on a cold visit — instant.
- **Dynamic holes** wrapped in `<Suspense>` that stream from the server
  per request.

The benefit: pages feel static while still allowing per-request data.
For a CMS-driven site like ours, this is the whole point — landing
pages render in <100 ms because the shell is at the edge, then the
CMS-driven body streams in.

The cost: **any uncached read in the static shell is a build-time error**.
The Next.js team's reasoning is that if you read uncached request data
during prerendering, the "static" shell isn't actually static — every
request blocks on that read, and you've silently lost PPR. So they
crash the build instead of letting you ship a slow site by accident.

Concretely, calling any of these in a non-`'use cache'` function above
a `<Suspense>` triggers the error:

- `await headers()`
- `await cookies()`
- `await getLocale()` (next-intl)
- Any other request-scoped read

The error we hit during deploy:

```
Error: Route "/[locale]/[[...slug]]": Uncached data was accessed outside
of <Suspense>. This delays the entire page from rendering, resulting in
a slow user experience. Learn more: https://nextjs.org/docs/messages/blocking-route
```

`__no-cms-pages-at-build__` is a synthetic path Next uses when
prerendering the shell with no specific CMS content, and that's where
the uncached `getLocale()` in the root layout blew up.

## Why each alternative is worse

### Option 1 — Middleware writes a header, root layout reads it

Sounds clean: the next-intl middleware already runs per request, so it
can stamp an `x-locale` header onto the request. The root layout reads
that header to set `<html lang>`.

Doesn't work because **reading a header in the root layout is still an
uncached read**. cacheComponents doesn't care whether the value came
from the URL or from a header — it cares that you read a per-request
value in the static shell. Every page would flip from `○`/`◐` (static
/ partially prerendered) to `ƒ` (fully dynamic). Total ISR/PPR loss.

### Option 2 — Hard-code `<html lang="en">` in the root (current)

Trivial change. Build passes. PPR fully preserved across all 22 static
pages.

Downsides:
- `lang` is wrong for `/no`, `/sv`, `/da`. Screen readers use the
  English pronunciation profile on Norwegian/Swedish/Danish content.
- Search engines may misclassify content language (low impact in
  practice — they also look at content itself — but not zero).
- Browser features (translate offer, hyphenation) key off this.

Tolerable as a stopgap. Not acceptable as a final state for a
multilingual Nordic-targeted site.

### Option 3 — Hard-code `<html lang="no">` (site default)

Same trade-off as Option 2, just shifts which locales are "wrong". Worse
for English-reading users (who are the most likely to notice and
complain), so we picked `en` instead — English speakers are more
forgiving of attribute mismatches than Nordic users are of being told
their content is English.

### Option 4 — Route groups (planned: see TODO doc)

Split `app/` into `(site)/[locale]/...`, `(internal)/...`, and
`(preview)/...`, each with its own root layout that renders `<html>`.
The `[locale]/layout.tsx` reads `params.locale` — and **`params` is a
static input, not an uncached read** — so it doesn't trigger the
cacheComponents error.

This is the correct fix. It's a non-trivial refactor (~half a day):
moving directories, extracting fonts/snippet/metadata into shared
helpers, deleting the old root layout, verifying every route still
prerenders. Tracked in [`todo-html-lang-per-locale.md`](./todo-html-lang-per-locale.md).

## Why this hasn't been solved upstream

The vercel/next.js#49415 discussion (linked at the top) has been open
since 2023 and runs to hundreds of comments. The Next.js team's
position is roughly:

- The fix isn't a feature; it's a documentation problem. The framework
  *does* support correct `<html lang>` — just via route groups, not via
  a single root layout.
- Adding a "set lang in a child layout" escape hatch would either
  require a new primitive (rejected as too narrow) or special-casing
  `<html>` rendering (rejected as adding magic).
- Community workarounds (server components passing `lang` via context,
  `next/headers` in the root layout, etc.) all either break PPR or
  produce subtly wrong output.

So the route-group split is the official answer. It's just not very
discoverable, and the trade-off (more files, duplicated layout setup)
catches teams off guard — which is exactly what happened here.

## TL;DR for new contributors

If you see `<html lang="en">` on Norwegian content and your first
instinct is "why isn't this dynamic?" — that's the right instinct.
It *should* be dynamic. The reason it isn't, today, is that doing it
dynamically would either (a) break the build under cacheComponents or
(b) force every page to be fully server-rendered, losing the PPR
performance win that makes this site fast.

The proper fix is route groups (Option 4 above). It's planned, just not
done yet because we needed to ship the metadata work for a demo first.
See [`todo-html-lang-per-locale.md`](./todo-html-lang-per-locale.md).

Please don't "fix" this by re-introducing `getLocale()` in the root
layout. It'll work locally and then crash the deploy.

---

## References

- Vercel discussion: <https://github.com/vercel/next.js/discussions/49415>
- Next.js docs — Route Groups: <https://nextjs.org/docs/app/building-your-application/routing/route-groups>
- Next.js docs — `blocking-route` error: <https://nextjs.org/docs/messages/blocking-route>
- next-intl docs — Static rendering: <https://next-intl-docs.vercel.app/docs/getting-started/app-router>
