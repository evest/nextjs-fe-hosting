import type { Metadata } from 'next';
import { Suspense } from 'react';
import { OptimizelyComponent } from '@optimizely/cms-sdk/react/server';
import { notFound } from 'next/navigation';
import { getPageContent } from '@/lib/optimizely/get-page';
import { getAllPagesPaths } from '@/lib/optimizely/all-pages';
import { getSeoMetadata } from '@/lib/seo';

type Props = {
  params: Promise<{
    slug: string[];
  }>;
};

export async function generateStaticParams() {
  return getAllPagesPaths();
}

// notFound() must be called from generateMetadata AND the page component
// (above any Suspense boundary), not from inside a suspended child. Under
// cacheComponents, the response status is committed when the static shell
// flushes; a notFound() thrown from inside <Suspense> swaps the body but
// not the status, so unknown URLs would otherwise serve 200 OK with a
// 30-day CDN cache. The duplicated getPageContent() call is cache-free
// (same slug → same cache key as generateMetadata).
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const content = await getPageContent(slug);
  if (!content) notFound();
  return getSeoMetadata(content as Record<string, unknown>);
}

function PageContent({ content }: { content: NonNullable<Awaited<ReturnType<typeof getPageContent>>> }) {
  return <OptimizelyComponent content={content} />;
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const content = await getPageContent(slug);
  if (!content) notFound();
  return (
    <Suspense>
      <PageContent content={content} />
    </Suspense>
  );
}
