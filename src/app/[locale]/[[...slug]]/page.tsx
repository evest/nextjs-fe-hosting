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
import { JsonLd } from '@/components/seo/JsonLd';
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
}: {
  content: NonNullable<Awaited<ReturnType<typeof getPageContent>>>;
  locale: string;
  isLocaleRoot: boolean;
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
  });
  if (!data) return null;
  return <JsonLd data={data} />;
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
        <PageJsonLd content={content} locale={locale} isLocaleRoot={isLocaleRoot} />
      </Suspense>
      <Suspense>
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
