// Predefined article categories. Values are stable slugs stored in the CMS;
// the human-readable label is looked up at render time from the locale
// messages under `Article.categories.{value}`, falling back to the
// `displayName` here if no translation exists. The schema is not
// `isLocalized` — the value is the same across locales by design.
//
// Two consumers read this list:
//   - The ArticlePage content type uses `ARTICLE_CATEGORY_ENUM` to render
//     the dropdown in the CMS editor.
//   - The ArticlePage React component uses `getCategoryFallback` to resolve
//     a label when the current locale has no translation.

export type ArticleCategory = {
  value: string;
  displayName: string;
};

export const ARTICLE_CATEGORIES: readonly ArticleCategory[] = [
  { value: 'content-strategy', displayName: 'Content Strategy' },
  { value: 'architecture', displayName: 'Architecture' },
  { value: 'technical', displayName: 'Technical' },
  { value: 'seo', displayName: 'SEO' },
  { value: 'geo', displayName: 'GEO' },
  { value: 'ai', displayName: 'AI' },
  { value: 'analytics', displayName: 'Analytics & Measurement' },
  { value: 'cro', displayName: 'CRO' },
  { value: 'personalization', displayName: 'Personalization' },
];

export const ARTICLE_CATEGORY_ENUM = ARTICLE_CATEGORIES.map((c) => ({
  value: c.value,
  displayName: c.displayName,
}));

export function getCategoryFallback(value: string | null | undefined): string | null {
  if (!value) return null;
  return ARTICLE_CATEGORIES.find((c) => c.value === value)?.displayName ?? value;
}
