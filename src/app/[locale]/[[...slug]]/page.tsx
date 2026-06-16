import type { Metadata } from 'next';
import { Suspense } from 'react';
import { OptimizelyComponent, withAppContext } from '@optimizely/cms-sdk/react/server';
import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { getPageContent } from '@/lib/optimizely/get-page';
import { getAllPagesPaths } from '@/lib/optimizely/all-pages';
import { getSeoMetadata } from '@/lib/seo';
import { getSiteSettings } from '@/lib/optimizely/get-site-settings';
import { buildJsonLd } from '@/lib/json-ld';
import { getBreadcrumbTrail, type BreadcrumbCrumb } from '@/lib/optimizely/get-breadcrumb-trail';
import { JsonLd } from '@/components/seo/JsonLd';
import { Breadcrumbs, type BreadcrumbItem } from '@/components/layout';
import { Container } from '@/components/ui';
import { routing } from '@/i18n/routing';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, '') ?? null;

type Props = {
  params: Promise<{
    locale: string;
    slug?: string[];
  }>;
};

export async function generateStaticParams() {
  return getAllPagesPaths();
}

function fullSlug(locale: string, slug?: string[]): string[] {
  return [locale, ...(slug ?? [])];
}

// Page types that get a breadcrumb (visible trail + BreadcrumbList JSON-LD).
// LandingPageExperience is intentionally excluded (campaign pages rarely sit in
// a real hierarchy). The trail self-suppresses when too shallow, so enabling a
// type is safe even for shallow instances.
const BREADCRUMB_TYPES = new Set(['ArticlePage', 'PersonPage', 'WebPage']);

function contentTypes(content: Record<string, unknown>): string[] {
  const meta = content._metadata as Record<string, unknown> | undefined;
  const types = (meta?.types as unknown[] | undefined) ?? [];
  return types.filter((t): t is string => typeof t === 'string');
}

// A page is breadcrumb-eligible if any of its types is enabled. Generic pages
// resolve as 'WebPage'; Article/Person carry their specific type. The base
// '_page' is ignored.
function isBreadcrumbEligible(content: Record<string, unknown>): boolean {
  return contentTypes(content).some((t) => BREADCRUMB_TYPES.has(t));
}

function selfDisplayName(content: Record<string, unknown>): string {
  const meta = content._metadata as Record<string, unknown> | undefined;
  const seo = content.seo as Record<string, unknown> | undefined;
  const name =
    (typeof seo?.metaTitle === 'string' && seo.metaTitle) ||
    (typeof content.heading === 'string' && content.heading) ||
    (typeof content.name === 'string' && content.name) ||
    (typeof meta?.displayName === 'string' && meta.displayName) ||
    '';
  return name;
}

// Map the resolved trail to the visible Breadcrumbs component's item shape.
function toBreadcrumbItems(trail: BreadcrumbCrumb[]): BreadcrumbItem[] {
  return trail.map((c) => ({ label: c.name, href: c.href ?? undefined }));
}

// notFound() must be called from generateMetadata AND the page component
// (above any Suspense boundary), not from inside a suspended child. Under
// cacheComponents, the response status is committed when the static shell
// flushes; a notFound() thrown from inside <Suspense> swaps the body but
// not the status, so unknown URLs would otherwise serve 200 OK with a
// 30-day CDN cache. The duplicated getPageContent() call is cache-free
// (same slug → same cache key as generateMetadata).
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const content = await getPageContent(fullSlug(locale, slug));
  if (!content) notFound();
  // hreflang alternates intentionally omitted: localized slugs differ per
  // locale (e.g. /no/om-oss vs /en/about) and the CMS owns the mapping.
  // TODO (Phase 6c): surface alternate URLs from the CMS payload and emit
  // `alternates.languages`.
  return getSeoMetadata(content as Record<string, unknown>);
}

function PageContent({ content }: { content: NonNullable<Awaited<ReturnType<typeof getPageContent>>> }) {
  return <OptimizelyComponent content={content} />;
}

// JSON-LD lives in its own Suspense boundary so the body can stream
// independently of the site-settings + author fetches the graph builder may
// trigger. Empty graph → render nothing.
async function PageJsonLd({
  content,
  locale,
  isLocaleRoot,
  breadcrumbTrail,
}: {
  content: NonNullable<Awaited<ReturnType<typeof getPageContent>>>;
  locale: string;
  isLocaleRoot: boolean;
  breadcrumbTrail?: BreadcrumbCrumb[];
}) {
  const siteSettings = await getSiteSettings(locale);
  const urlPath = ((content._metadata?.url as Record<string, unknown> | undefined)?.default as string | undefined) ?? null;
  const pageUrl = urlPath && SITE_URL ? `${SITE_URL}${urlPath.replace(/\/$/, '') || '/'}` : null;
  const data = await buildJsonLd(content as Record<string, unknown>, {
    locale,
    siteSettings,
    siteUrl: SITE_URL,
    pageUrl,
    isLocaleRoot,
    breadcrumbTrail,
  });
  if (!data) return null;
  return <JsonLd data={data} />;
}

// Resolves the breadcrumb trail (Graph ancestor lookups) and renders the
// visible <Breadcrumbs> + its BreadcrumbList JSON-LD together, so both share
// one trail resolution. Lives in its own Suspense boundary because the ancestor
// lookups are async; the trail self-suppresses when too shallow.
async function PageBreadcrumbs({
  content,
  locale,
  slug,
  isLocaleRoot,
}: {
  content: NonNullable<Awaited<ReturnType<typeof getPageContent>>>;
  locale: string;
  slug?: string[];
  isLocaleRoot: boolean;
}) {
  const record = content as Record<string, unknown>;
  if (isLocaleRoot || !isBreadcrumbEligible(record)) {
    // Still emit non-breadcrumb JSON-LD for this page.
    return <PageJsonLd content={content} locale={locale} isLocaleRoot={isLocaleRoot} />;
  }

  const trail = await getBreadcrumbTrail(fullSlug(locale, slug), selfDisplayName(record), SITE_URL);
  // A 2-crumb trail (Home → self, no resolved/indexable ancestors) is not a
  // meaningful breadcrumb — skip the visible UI and the JSON-LD for it.
  const showBreadcrumb = trail.length >= 3;

  return (
    <>
      <PageJsonLd
        content={content}
        locale={locale}
        isLocaleRoot={isLocaleRoot}
        breadcrumbTrail={showBreadcrumb ? trail : undefined}
      />
      {showBreadcrumb && (
        <Container size="narrow" className="pt-6">
          <Breadcrumbs items={toBreadcrumbItems(trail)} />
        </Container>
      )}
    </>
  );
}

async function Page({ params }: Props) {
  const { locale, slug } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const content = await getPageContent(fullSlug(locale, slug));
  if (!content) notFound();
  const isLocaleRoot = !slug || slug.length === 0;
  return (
    <>
      <Suspense>
        <PageBreadcrumbs
          content={content}
          locale={locale}
          slug={slug}
          isLocaleRoot={isLocaleRoot}
        />
      </Suspense>
      {/*
        cacheComponents streams this dynamic content into the prerendered
        shell. The shell also paints the layout's <Footer>, so without a
        height-reserving fallback the footer flushes directly under the header
        and then jumps down ~3000px when content streams in (CLS ~0.92, which
        also invalidates the early LCP). The fallback reserves ~viewport height
        so the footer starts below the fold and the shift is negligible.
      */}
      <Suspense fallback={<div className="min-h-svh" aria-hidden />}>
        <PageContent content={content} />
      </Suspense>
    </>
  );
}

// withAppContext initialises request-scoped context storage for the routed
// content. Server components down the tree can call getContext() /
// getContextData() to read e.g. content key without prop drilling. (Locale
// is owned by next-intl — read it via useLocale() / getLocale(), not the
// SDK context.)
export default withAppContext(Page);
