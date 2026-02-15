import { GraphClient, type PreviewParams } from '@optimizely/cms-sdk';
import { OptimizelyComponent } from '@optimizely/cms-sdk/react/server';
import { PreviewComponent } from '@optimizely/cms-sdk/react/client';
import { getGraphGatewayUrl } from '@/lib/config';
import PreviewError from '@/components/layout/PreviewError';
import Script from 'next/script';


type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function Page({ searchParams }: Props) {
  const params = await searchParams;
  const client = new GraphClient(process.env.OPTIMIZELY_GRAPH_SINGLE_KEY!, {
    graphUrl: getGraphGatewayUrl(),
  });

  let response;
  let error: unknown = null;

  try {
    response = await client.getPreviewContent(params as PreviewParams);
  } catch (err: unknown) {
    error = err;
  }

  if (error) {
    return <PreviewError error={error} params={params} />;
  }

  return (
    <div>
      <Script
        src={`${process.env.OPTIMIZELY_CMS_URL}/util/javascript/communicationinjector.js`}
        strategy="afterInteractive"
      ></Script>
      <PreviewComponent />
      <OptimizelyComponent opti={response} />
    </div>
  );
}
