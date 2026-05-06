import { Suspense } from 'react';
import { getClient, type PreviewParams } from '@optimizely/cms-sdk';
import { OptimizelyComponent, withAppContext } from '@optimizely/cms-sdk/react/server';
import { PreviewComponent } from '@optimizely/cms-sdk/react/client';
import PreviewError from '@/components/layout/PreviewError';
import Script from 'next/script';

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
    return <PreviewError error={error} params={params} />;
  }

  return <OptimizelyComponent content={response} />;
}

function Page({ searchParams }: Props) {
  return (
    <div>
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
