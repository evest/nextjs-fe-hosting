import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['en', 'no', 'sv', 'da'] as const,
  defaultLocale: 'no',
  localePrefix: 'always',
});

export type Locale = (typeof routing.locales)[number];
