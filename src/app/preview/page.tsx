import { Suspense } from 'react';
import { GraphClient, type PreviewParams } from '@optimizely/cms-sdk';
import { OptimizelyComponent } from '@optimizely/cms-sdk/react/server';
import { PreviewComponent } from '@optimizely/cms-sdk/react/client';
import { getGraphGatewayUrl } from '@/lib/config';
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
  const client = new GraphClient(process.env.OPTIMIZELY_GRAPH_SINGLE_KEY!, {
    graphUrl: getGraphGatewayUrl(),
  });

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

export default function Page({ searchParams }: Props) {
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
