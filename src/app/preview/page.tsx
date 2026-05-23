import { Suspense } from 'react';
import { getClient, type PreviewParams } from '@optimizely/cms-sdk';
import { OptimizelyComponent, withAppContext } from '@optimizely/cms-sdk/react/server';
import { PreviewComponent } from '@optimizely/cms-sdk/react/client';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { Header, Footer } from '@/components/layout';
import PreviewError from '@/components/layout/PreviewError';
import PreviewBanner from '@/components/layout/PreviewBanner';
import { getSiteSettings } from '@/lib/optimizely/get-site-settings';
import { buildJsonLd } from '@/lib/json-ld';
import { JsonLd } from '@/components/seo/JsonLd';
import Script from 'next/script';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, '') ?? null;

// Editor-only route. Must reflect the latest CMS state on every request —
// freshness over performance. Under cacheComponents, the uncached
// getPreviewContent() call has to live inside <Suspense>, so the data fetch
// is extracted into PreviewBody. The shell ships immediately, the body
// streams when Graph responds.

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

async function PreviewBody({ searchParams }: Props) {
  const params = await searchParams;

  // Bridge the CMS-supplied locale (`loc` param) into next-intl so any
  // useTranslations() call inside rendered components resolves correctly.
  // Falls back to the default locale on mismatch — better to render than
  // to block the editor with a notFound().
  const locParam = typeof params.loc === 'string' ? params.loc : undefined;
  const locale = hasLocale(routing.locales, locParam) ? locParam : routing.defaultLocale;
  setRequestLocale(locale);
  const messages = (await import(`../../../messages/${locale}.json`)).default;

  const client = getClient();

  let response;
  let error: unknown = null;
  const maxRetries = 3;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      error = null;
      response = await client.getPreviewContent(params as PreviewParams);
      break;
    } catch (err: unknown) {
      error = err;
      const isNotYetIndexed =
        err instanceof Error && err.message.includes('No content found for key');
      if (isNotYetIndexed && attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 200));
        continue;
      }
      break;
    }
  }

  if (error) {
    return (
      <NextIntlClientProvider locale={locale} messages={messages}>
        <Header />
        <main className="flex-1">
          <PreviewError error={error} params={params} />
        </main>
        <Footer />
      </NextIntlClientProvider>
    );
  }

  // Build JSON-LD in preview too so editors can verify their SEO/GEO output
  // against the live data without publishing. Preview pages are noindex via
  // robots.ts, so emitted JSON-LD doesn't risk being crawled.
  const siteSettings = await getSiteSettings(locale);
  const previewContent = (response ?? {}) as Record<string, unknown>;
  const urlPath = ((previewContent._metadata as Record<string, unknown> | undefined)?.url as Record<string, unknown> | undefined)?.default as string | undefined;
  const pageUrl = urlPath && SITE_URL ? `${SITE_URL}${urlPath.replace(/\/$/, '') || '/'}` : null;
  const jsonLd = await buildJsonLd(previewContent, {
    locale,
    siteSettings,
    siteUrl: SITE_URL,
    pageUrl: pageUrl ?? null,
    isLocaleRoot: urlPath === `/${locale}` || urlPath === `/${locale}/`,
  });

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {jsonLd && <JsonLd data={jsonLd} />}
      <Header />
      <main className="flex-1">
        <OptimizelyComponent content={response} />
      </main>
      <Footer />
    </NextIntlClientProvider>
  );
}

function Page({ searchParams }: Props) {
  return (
    <div className="flex-1 flex flex-col">
      <PreviewBanner />
      <Script
        src={`${process.env.OPTIMIZELY_CMS_URL}/util/javascript/communicationinjector.js`}
        strategy="beforeInteractive"
        id="optimizely-communication-injector"
      />
      <PreviewComponent />
      <Suspense>
        <PreviewBody searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

// withAppContext is required for preview mode: it initialises the
// request-scoped context that getPreviewContent() then populates with
// preview_token, key, locale, version, mode. Components down the tree can
// then read those via getContextData() — e.g. RichText automatically uses
// the preview_token to append it to image URLs.
export default withAppContext(Page);
