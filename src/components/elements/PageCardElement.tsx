import { ContentProps } from '@optimizely/cms-sdk';
import { getPreviewUtils } from '@optimizely/cms-sdk/react/server';
import { PageCardElementCT } from '@/content-types/PageCardElement';
import { getPageContent } from '@/lib/optimizely/get-page';
import Image from 'next/image';
import Link from 'next/link';

type Props = {
  content: ContentProps<typeof PageCardElementCT>;
};

function pathToSlug(url: string): string[] {
  return url.split('/').filter(Boolean);
}

// Linked pages are heterogeneous — pick the first non-empty value from a
// list of likely property keys.
function pickString(source: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'string' && value.trim()) return value;
  }
  return undefined;
}

export default async function PageCardElement({ content: opti }: Props) {
  const { pa } = getPreviewUtils(opti);

  const href = opti.content?.url?.default;

  if (!href) {
    return (
      <div
        className="bg-card rounded-xl shadow-md overflow-hidden p-6 border border-dashed border-muted-foreground/40"
        {...pa('content')}
      >
        <p className="text-muted-foreground text-sm">Select a page...</p>
      </div>
    );
  }

  const linked = (await getPageContent(pathToSlug(href))) as Record<string, unknown> | null;

  if (!linked) {
    return (
      <div
        className="bg-card rounded-xl shadow-md overflow-hidden p-6"
        {...pa('content')}
      >
        <p className="text-muted-foreground text-sm">Linked page not found</p>
      </div>
    );
  }

  const metadata = linked._metadata as { displayName?: string } | undefined;
  const seo = linked.seo as Record<string, unknown> | undefined;

  const heading =
    pickString(linked, ['heading', 'name', 'title']) ?? metadata?.displayName ?? 'Untitled';

  const description =
    (typeof seo?.metaDescription === 'string' && seo.metaDescription.trim()
      ? (seo.metaDescription as string)
      : undefined) ?? pickString(linked, ['ingress']);

  const ogImage = seo?.openGraphImage as { url?: { default?: string } } | undefined;
  const ogImageUrl = ogImage?.url?.default;

  return (
    <Link
      href={href}
      className="group block bg-card rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300"
      {...pa('content')}
    >
      {ogImageUrl && (
        <div className="relative h-48 w-full">
          <Image
            src={ogImageUrl}
            alt={heading}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        </div>
      )}

      <div className="p-6">
        <h3 className="text-xl font-semibold text-card-foreground mb-2 group-hover:text-accent transition-colors">
          {heading}
        </h3>

        {description && (
          <p className="text-muted-foreground text-sm line-clamp-3">{description}</p>
        )}
      </div>
    </Link>
  );
}
