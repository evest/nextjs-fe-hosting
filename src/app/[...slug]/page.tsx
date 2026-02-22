import { GraphClient } from '@optimizely/cms-sdk';
import { OptimizelyComponent } from '@optimizely/cms-sdk/react/server';
import { notFound } from 'next/navigation';
import { getGraphGatewayUrl } from '@/lib/config';

type Props = {
  params: Promise<{
    slug: string[];
  }>;
};

export default async function Page({ params }: Props) {
  const { slug } = await params;

  const client = new GraphClient(process.env.OPTIMIZELY_GRAPH_SINGLE_KEY!, {
    graphUrl: getGraphGatewayUrl(),
  });

  const content = await client.getContentByPath(`/${slug.join('/')}/`);

  if (!content || content.length === 0) {
    notFound();
  }

  return <OptimizelyComponent opti={content[0]} />;
}
