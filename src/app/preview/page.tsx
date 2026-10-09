import { Suspense } from 'react';
import { getClient, type PreviewParams } from '@optimizely/cms-sdk';
import { OptimizelyComponent, withAppContext } from '@optimizely/cms-sdk/react/server';
import { NextPreviewComponent } from '@optimizely/cms-sdk/react/nextjs';
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

// PreviewError is a client component. An Error instance passed as a prop is
// redacted by React in production builds (the editor just sees "Minified React
// error #441"), so hand it a plain object carrying the SDK error fields instead.
function serializeError(err: unknown) {
  if (!(err instanceof Error)) return { name: 'Error', message: String(err) };
  const { request, status, errors, contentType } = err as Error & Record<string, unknown>;
  // Drop absent fields: PreviewError's guards test with `'request' in err`.
  const extra = Object.fromEntries(
    Object.entries({ request, status, errors, contentType }).filter(([, v]) => v !== undefined),
  );
  return { name: err.name, message: err.message, ...extra };
}

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

  // Media assets (ImageMedia etc.) aren't localized, so the CMS sends `loc=`
  // (empty). The SDK forwards that verbatim as `metadataLocale: ""`, which
  // matches nothing in Graph → "Content with key … could not be found".
  // Omitting loc lets the by-key lookup match the locale-neutral asset.
  const previewParams = { ...params } as PreviewParams;
  if (!previewParams.loc) delete (previewParams as Partial<PreviewParams>).loc;

  let response;
  let error: unknown = null;
  const maxRetries = 3;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      error = null;
      response = await client.getPreviewContent(previewParams);
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
          <PreviewError error={serializeError(error)} params={params} />
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
      {/* On CMS save, soft-refreshes via router.refresh() (re-runs PreviewBody
          on the server) instead of a full reload. The pill stays up until the
          new RSC payload has landed. */}
      <NextPreviewComponent>
        <div
          role="status"
          className="fixed bottom-4 right-4 z-50 rounded-full bg-brand px-4 py-2 text-sm text-brand-foreground shadow-lg"
        >
          Updating preview…
        </div>
      </NextPreviewComponent>
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
