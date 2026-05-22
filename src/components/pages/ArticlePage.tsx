import { ContentProps, damAssets } from '@optimizely/cms-sdk';
import { RichText } from '@optimizely/cms-sdk/react/richText';
import {
  OptimizelyComponent,
  getContextData,
  getPreviewUtils,
} from '@optimizely/cms-sdk/react/server';
import { getLocale, getTranslations } from 'next-intl/server';
import Link from 'next/link';
import Image from 'next/image';
import { ArticlePageCT } from '@/content-types/ArticlePage';
import { Container, Prose } from '@/components/ui';
import { decodeRichTextEntities, getReadingTime } from '@/lib/rich-text';
import { getPerson } from '@/lib/optimizely/get-person';

type Props = {
  content: ContentProps<typeof ArticlePageCT>;
};

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('');
}

function formatPublished(iso: string | null | undefined, locale: string): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

// Highlight the lead-in clause of a headline: when the heading contains a
// colon, render the part up to and including the colon in italic brand
// colour. "The Content Audit: How to find..." → emphasises "The Content Audit:".
function renderHeading(text: string | null | undefined): React.ReactNode {
  if (!text) return text;
  const idx = text.indexOf(':');
  if (idx === -1) return text;
  return (
    <>
      <em className="italic text-brand">{text.slice(0, idx + 1)}</em>
      {text.slice(idx + 1)}
    </>
  );
}

export default async function ArticlePage({ content }: Props) {
  const { pa, src } = getPreviewUtils(content);
  const { getAlt } = damAssets(content);

  const locale = await getLocale();
  const t = await getTranslations('Article');

  const authorPath = content.author?.url?.default;
  const authorHost = content.author?.url?.base;
  const author = authorPath
    ? await getPerson(String(authorPath), authorHost ? String(authorHost) : undefined)
    : null;

  const authorImageUrl = author ? getPreviewUtils(author).src(author.image) : null;
  const authorImageAlt = author
    ? damAssets(author).getAlt(author.image, author.name ?? 'Author')
    : '';

  const hideTimings = content.hideDateAndReadTime ?? false;
  const publishedDate = hideTimings ? null : formatPublished(content._metadata?.published, locale);
  const readingMinutes = hideTimings ? null : getReadingTime(content.body?.json);
  const showMeta = !!(author || publishedDate || readingMinutes != null);

  const blocks = content.additionalContent ?? [];
  const renderedBlocks = blocks.map((block, i) => (
    <OptimizelyComponent key={i} content={block} />
  ));
  // pa() emits Visual Builder edit attributes; in published rendering it's a
  // no-op, so the wrapper div is only worth rendering inside the editor —
  // there it gives the editor a drop target for the array.
  const inPreview = !!getContextData('previewToken');

  return (
    <>
      <Container size="narrow" className="py-8">
        <article>
          {content.eyebrow && (
            <span
              className="block text-sm font-semibold uppercase tracking-[0.18em] text-highlight mb-4"
              {...pa('eyebrow')}
            >
              {content.eyebrow}
            </span>
          )}

          <h1
            className="font-display text-foreground text-3xl md:text-4xl lg:text-6xl mb-6"
            {...pa('heading')}
          >
            {renderHeading(content.heading)}
          </h1>

          {content.ingress && (
            <p
              className="text-xl md:text-2xl text-muted-foreground leading-relaxed mb-6"
              {...pa('ingress')}
            >
              {content.ingress}
            </p>
          )}

          {showMeta && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm mb-8">
              {author && authorPath && (
                <Link
                  href={String(authorPath)}
                  className="group flex items-center gap-3"
                  {...pa('author')}
                >
                  {authorImageUrl ? (
                    <span className="relative w-12 h-12 shrink-0 rounded-full overflow-hidden">
                      <Image
                        src={authorImageUrl}
                        alt={authorImageAlt}
                        fill
                        className="object-cover"
                        sizes="48px"
                      />
                    </span>
                  ) : (
                    <span
                      aria-hidden
                      className="flex items-center justify-center w-12 h-12 shrink-0 rounded-full bg-primary text-primary-foreground text-sm font-semibold"
                    >
                      {getInitials(author.name ?? '')}
                    </span>
                  )}
                  <span className="flex flex-col leading-tight">
                    <span className="font-semibold text-foreground group-hover:underline">
                      {author.name}
                    </span>
                    {author.title && (
                      <span className="text-muted-foreground">{author.title}</span>
                    )}
                  </span>
                </Link>
              )}
              {publishedDate && (
                <>
                  {author && (
                    <span aria-hidden className="text-muted-foreground/50">
                      •
                    </span>
                  )}
                  <span className="text-muted-foreground">
                    <time dateTime={content._metadata?.published ?? undefined}>
                      {publishedDate}
                    </time>
                  </span>
                </>
              )}
              {readingMinutes != null && (
                <>
                  {(author || publishedDate) && (
                    <span aria-hidden className="text-muted-foreground/50">
                      •
                    </span>
                  )}
                  <span className="text-muted-foreground">
                    {t('minRead', { count: readingMinutes })}
                  </span>
                </>
              )}
            </div>
          )}

          {src(content.featuredImage) && (
            <div className="relative w-full h-64 md:h-96 mb-8 rounded-lg overflow-hidden">
              <Image
                src={src(content.featuredImage)!}
                alt={getAlt(content.featuredImage, 'Featured image')}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 896px"
                {...pa('featuredImage')}
              />
            </div>
          )}

          {content.body && (
            <Prose className="prose-h2:mt-[0.93em] prose-h2:mb-[0.53em]" {...pa('body')}>
              <RichText content={decodeRichTextEntities(content.body?.json)} />
            </Prose>
          )}
        </article>
      </Container>

      {inPreview ? (
        <div {...pa('additionalContent')}>{renderedBlocks}</div>
      ) : (
        renderedBlocks
      )}
    </>
  );
}
