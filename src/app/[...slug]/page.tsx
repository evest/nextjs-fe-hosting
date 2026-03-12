import type { Metadata } from 'next';
import { GraphClient } from '@optimizely/cms-sdk';
import { OptimizelyComponent } from '@optimizely/cms-sdk/react/server';
import { notFound } from 'next/navigation';
import { getGraphGatewayUrl } from '@/lib/config';
import { getSeoMetadata } from '@/lib/seo';

type Props = {
  params: Promise<{
    slug: string[];
  }>;
};

function getClient() {
  return new GraphClient(process.env.OPTIMIZELY_GRAPH_SINGLE_KEY!, {
    graphUrl: getGraphGatewayUrl(),
  });
}

async function getContent(slug: string[]) {
  const client = getClient();
  const content = await client.getContentByPath(`/${slug.join('/')}/`);
  return content?.[0] ?? null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const content = await getContent(slug);
  if (!content) return {};
  return getSeoMetadata(content as Record<string, unknown>);
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const content = await getContent(slug);

  if (!content) {
    notFound();
  }

  return <OptimizelyComponent opti={content} />;
}
