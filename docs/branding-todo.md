# Content Gurus branding — to-do

The Phase 1–6 port left the site fully functional but visually neutral. The
logo is in place; everything below is what's still placeholder or generic.

Roughly in impact order — the **first three are what visitors and the CMS
team see daily**, the rest is polish.

---

## 🔴 Must-do

### 1. Brand colors ✅ done

Shipped in `fcdd67e` + follow-ups. `--accent` is logo navy (`#1e3a8a`,
with the brighter `#1E5BD8` left commented for easy swap), `--highlight`
is logo orange (`#F37021`) and surfaces on hero/callout eyebrows, stat
values, and solution-tile stripes. `--footer` is deep navy (`#0F1B3D`)
plus matching foreground/muted/border. `--primary` now tracks `--accent`
so future brand tweaks flow through. The `.section-dark` accent uses a
lighter brand-blue variant (`#7C9DFF`) so dark surfaces stay on-brand.

### 2. Real navigation

**Files:** `messages/en.json`, `messages/no.json`, `messages/sv.json`,
`messages/da.json` — `Header.nav` and `Header.submenu`.

Currently placeholder Services / Insights / About / Contact with generic
sub-items (Content Strategy, Implementation, etc.). Replace with the actual
offerings.

- Slugs flow straight through to next-intl `<Link>` — they **don't need to
  be identical across locales** (e.g. `/services` in English, `/tjenester`
  in Norwegian is fine and SEO-friendly).
- Add/remove submenu keys as needed; `src/components/layout/Header.tsx`
  `buildMenuItems()` (~line 80) is what reads them — update the keys it
  references if you change the shape.

### 3. Footer copy + social links

**Copy:** `messages/*.json` `Footer.tagline`, `Footer.sections.*`,
`Footer.links.*` — currently placeholder Content Gurus tagline + generic
About / Careers / Contact / Privacy / Cookies / Terms.

**Social URLs:** `src/components/layout/Footer.tsx` lines 7–11 — the
`socialLinks` array is hardcoded with `twitter.com`, `linkedin.com`,
`github.com` placeholder URLs. Replace with the real Content Gurus profiles
(or drop ones that don't apply).

---

## 🟡 Nice-to-have

### 4. Page metadata + default title

**File:** `src/app/layout.tsx`

```ts
export const metadata: Metadata = {
  title: "Content Gurus",
  description: "Optimizely SaaS CMS expertise for Nordic brands.",
};
```

The title is fine as a fallback; the description is a generic placeholder
— swap for the real value prop. This is what appears in browser tabs +
search results when a page doesn't override via its SEO block.

### 5. Favicon + Open Graph default image

- **Favicon:** `src/app/favicon.ico` is still the Next.js default. Replace
  with a branded ICO (and consider adding `apple-touch-icon.png`,
  `icon.svg`, etc. — Next picks them up automatically when placed in
  `src/app/`).
- **Default OG image:** add `public/og-image.png` (1200×630) and wire it as
  a fallback in `src/lib/seo.ts` `getSeoMetadata()` — when `content.seo`
  has no `openGraphImage`, fall back to `${SITE_URL}/og-image.png`. Makes
  every share on Slack/LinkedIn/X look intentional instead of a blank card.

### 6. Typography

**File:** `src/app/layout.tsx`

Currently loads Geist via `next/font/google`. One place to swap if Content
Gurus has a brand typeface. The CSS variable `--font-sans` in
`globals.css` (line 60) is wired to it.

---

## ⚪ Optional polish

### 7. 404 + preview copy

- `messages/*.json` `NotFound` — generic "page doesn't exist" message.
  Replace with something on-brand (humour, useful links, the usual).
- `src/components/layout/PreviewError.tsx` is editor-facing only, so
  neutral copy is genuinely fine. Skip unless someone asks.

---

## How to verify

After any change above:

```
npm run dev
```

Open `/no`, `/en`, `/sv`, `/da` and walk:

- Header logo + nav strings match brand
- Locale switcher works and preserves slug
- Footer tagline + social icons land on real URLs
- Drop one of each marketing block in CMS Visual Builder, check colours
  read as expected against `--accent` / `--primary`
- View page source: `<title>`, OG tags, favicon link all reference the
  real brand
