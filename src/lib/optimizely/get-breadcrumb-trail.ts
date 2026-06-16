import { getTranslations } from 'next-intl/server';
import { getPageContent } from '@/lib/optimizely/get-page';

/**
 * Builds the breadcrumb trail for a CMS page from its URL ancestry.
 *
 * Pages are resolved by path (get-page → getContentByPath), so a page's
 * ancestors are simply the prefixes of its slug:
 *
 *   /en/blog/why-b2b-content-drives-growth
 *     → /en/                  (Home, the locale root)
 *     → /en/blog/             (the Blog listing page)
 *     → /en/blog/why-…        (self)
 *
 * Each intermediate prefix is resolved via getPageContent (the SAME cache the
 * page route fills, so a warmed ancestor is a cache HIT). For every ancestor we
 * read its localized displayName and its SEO `noIndex` flag:
 *
 *   - A prefix that doesn't resolve to a real page is SKIPPED (a slug segment
 *     can be a routing folder with no standalone page).
 *   - A prefix whose SEO block has `noIndex = true` is SKIPPED (it shouldn't
 *     appear in a search-facing breadcrumb). Most thin/utility pages carry this.
 *
 * The trail always starts with a "Home" crumb (translated) pointing at the
 * locale root, and ends with the current page. Never throws: a Graph failure
 * degrades to `[Home, self]` so the page still renders.
 */

export type BreadcrumbCrumb = {
  name: string;
  /** Absolute URL (siteUrl + path) — matches the canonical/OG URLs. */
  url: string;
  /** Locale-relative path for the next-intl <Link> (e.g. "/blog"); null = no link. */
  href: string | null;
};

type Content = Record<string, unknown>;

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function readDisplayName(content: Content): string | null {
  const meta = content._metadata as Content | undefined;
  return readString(meta?.displayName);
}

function readNoIndex(content: Content): boolean {
  const seo = content.seo as Content | undefined;
  return seo?.noIndex === true;
}

/** Absolute URL from a full path ("/en/blog"), trailing slash trimmed. */
function absoluteUrl(siteUrl: string | null, path: string): string {
  if (!siteUrl) return path;
  return `${siteUrl}${path.replace(/\/$/, '') || '/'}`;
}

/**
 * Strip the leading locale segment from a full slug to get the next-intl
 * locale-relative href ("/en/blog" with locale "en" → "/blog"; the locale root
 * → "/"). next-intl's <Link> re-adds the active locale prefix.
 */
function localeRelativeHref(fullSlug: string[]): string {
  const rest = fullSlug.slice(1);
  return rest.length === 0 ? '/' : `/${rest.join('/')}`;
}

/**
 * Build the ordered breadcrumb trail for a page.
 *
 * @param fullSlug  [locale, ...segments] — the page's full slug.
 * @param selfName  The page's own display name (already resolved by the caller).
 * @param siteUrl   Absolute site origin for the JSON-LD `item` URLs (or null).
 */
export async function getBreadcrumbTrail(
  fullSlug: string[],
  selfName: string,
  siteUrl: string | null,
): Promise<BreadcrumbCrumb[]> {
  const locale = fullSlug[0];
  const t = await getTranslations({ locale, namespace: 'Breadcrumbs' });

  // Home is always first and always links to the locale root.
  const homePath = `/${locale}`;
  const home: BreadcrumbCrumb = {
    name: t('home'),
    url: absoluteUrl(siteUrl, homePath),
    href: '/',
  };

  // Self is always last; the visible self-crumb is not a link.
  const selfPath = `/${fullSlug.join('/')}`;
  const self: BreadcrumbCrumb = {
    name: selfName,
    url: absoluteUrl(siteUrl, selfPath),
    href: null,
  };

  // Intermediate prefixes: everything between the locale root and the page.
  // For [en, blog, why-…] that's just [en, blog]. We resolve each to confirm
  // it's a real, indexable page before adding it to the trail.
  const middle: BreadcrumbCrumb[] = [];
  const segments = fullSlug.slice(1); // drop locale
  try {
    for (let i = 0; i < segments.length - 1; i++) {
      const prefixSlug = [locale, ...segments.slice(0, i + 1)];
      const ancestor = (await getPageContent(prefixSlug)) as Content | null;
      if (!ancestor) continue; // routing folder, no standalone page → skip
      if (readNoIndex(ancestor)) continue; // excluded from search-facing nav → skip
      const name = readDisplayName(ancestor);
      if (!name) continue; // nothing sensible to show → skip
      const path = `/${prefixSlug.join('/')}`;
      middle.push({
        name,
        url: absoluteUrl(siteUrl, path),
        href: localeRelativeHref(prefixSlug),
      });
    }
  } catch (e) {
    // Degrade to [Home, self] rather than failing the page.
    console.error('[get-breadcrumb-trail] ancestor resolution failed:', e);
    return [home, self];
  }

  return [home, ...middle, self];
}
