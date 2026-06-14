import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['en', 'no', 'sv', 'da'] as const,
  defaultLocale: 'en',
  localePrefix: 'always',
  // Disable next-intl's NEXT_LOCALE cookie. The middleware setting it on every
  // page response forces `Cache-Control: private, no-store`, which makes the
  // Cloudflare edge bypass our HTML entirely (cf-cache-status: DYNAMIC) — see
  // docs/todo-cdn-html-caching.md. Locale is fully URL-driven here
  // (localePrefix: 'always' → /en/…, /no/…) and nothing in the app reads this
  // cookie, so removing it costs only one thing: the bare `/` redirect no
  // longer remembers a returning visitor's *manually switched* language. New
  // visitors still get Accept-Language detection; otherwise `/` → defaultLocale
  // (now /en).
  localeCookie: false,
});

export type Locale = (typeof routing.locales)[number];
