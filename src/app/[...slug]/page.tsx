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

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const content = await getPageContent(slug);
  if (!content) return {};
  return getSeoMetadata(content as Record<string, unknown>);
}

// Suspense wraps the page body for a defence-in-depth reason: under
// cacheComponents, any uncached server data access on a route must be inside
// a Suspense boundary. With generateStaticParams above, every published page
// is pre-rendered at build and the boundary resolves synchronously from the
// Redis-backed cache (Phase 3). For URLs that aren't in generateStaticParams
// (404s, brand-new pages), it streams a skeleton-free fallback while
// getPageContent runs.
async function PageContent({ slug }: { slug: string[] }) {
  const content = await getPageContent(slug);
  if (!content) {
    notFound();
  }
  return <OptimizelyComponent content={content} />;
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  return (
    <Suspense>
      <PageContent slug={slug} />
    </Suspense>
  );
}
