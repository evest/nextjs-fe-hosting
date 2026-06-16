import { ContentProps } from '@optimizely/cms-sdk';
import { getPreviewUtils } from '@optimizely/cms-sdk/react/server';
import { PageCardElementCT } from '@/content-types/PageCardElement';
import { getPageContent } from '@/lib/optimizely/get-page';
import { Card, CardBody, CardMedia, Heading } from '@/components/ui';
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
      <Card className="border border-dashed border-muted-foreground/40" {...pa('content')}>
        <CardBody>
          <p className="text-muted-foreground text-sm">Select a page...</p>
        </CardBody>
      </Card>
    );
  }

  const linked = (await getPageContent(pathToSlug(href))) as Record<string, unknown> | null;

  if (!linked) {
    return (
      <Card {...pa('content')}>
        <CardBody>
          <p className="text-muted-foreground text-sm">Linked page not found</p>
        </CardBody>
      </Card>
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
    <Link href={href} className="group block" {...pa('content')}>
      <Card>
        {ogImageUrl && (
          <CardMedia>
            <Image
              src={ogImageUrl}
              alt={heading}
              fill
              className="object-cover"
              // Same card grid as CardBlock (1/2/3-col within max-w-7xl): the
              // slot never exceeds ~390px CSS wide, so cap at 400px rather than
              // 33vw to stop wide screens pulling an oversized render.
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px"
            />
          </CardMedia>
        )}

        <CardBody>
          <Heading
            level="h3"
            className="text-card-foreground mb-2 group-hover:text-brand transition-colors"
          >
            {heading}
          </Heading>

          {description && (
            <p className="text-muted-foreground text-sm line-clamp-3">{description}</p>
          )}
        </CardBody>
      </Card>
    </Link>
  );
}
