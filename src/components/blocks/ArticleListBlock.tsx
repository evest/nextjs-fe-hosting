import { ContentProps } from '@optimizely/cms-sdk';
import { getPreviewUtils } from '@optimizely/cms-sdk/react/server';
import { getLocale, getTranslations } from 'next-intl/server';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { ArticleListBlockCT } from '@/content-types/ArticleListBlock';
import { ArticleListBlockDisplayTemplate } from '@/display-templates/ArticleListBlockDisplayTemplate';
import { getArticlesUnder, type ArticleListItem } from '@/lib/optimizely/get-articles-under';
import { Container } from '@/components/ui';
import { cn } from '@/lib/utils';

type Props = {
  content: ContentProps<typeof ArticleListBlockCT>;
  displaySettings?: ContentProps<typeof ArticleListBlockDisplayTemplate>;
};

const surfaceClass = {
  light: 'text-foreground',
  muted: 'section-muted bg-background text-foreground',
  dark: 'section-dark bg-background text-foreground',
};

// Vertical and horizontal padding scales for the editor-controlled spacing
// settings. "medium" matches the previous list-layout default; the previous
// grid default (py-16 md:py-24) is available as "large".
const verticalPaddingClass = {
  none: 'py-0',
  small: 'py-6 md:py-8',
  medium: 'py-10 md:py-14',
  large: 'py-16 md:py-24',
};

// Horizontal padding is applied to the inner Container, overriding its
// default px-4 sm:px-6 lg:px-8 via tailwind-merge in cn().
const horizontalPaddingClass = {
  none: 'px-0 sm:px-0 lg:px-0',
  small: 'px-2 sm:px-3 lg:px-4',
  medium: 'px-4 sm:px-6 lg:px-8',
  large: 'px-6 sm:px-10 lg:px-16',
};

export default async function ArticleListBlock({ content, displaySettings }: Props) {
  const { pa } = getPreviewUtils(content);
  const locale = await getLocale();
  const t = await getTranslations('Cta');
  const readMoreLabel = t('learnMore');
  const surface = (displaySettings?.surface ?? 'light') as keyof typeof surfaceClass;
  const layout = displaySettings?.layout ?? 'list';
  const verticalPadding = (displaySettings?.verticalPadding ?? 'medium') as keyof typeof verticalPaddingClass;
  const horizontalPadding = (displaySettings?.horizontalPadding ?? 'medium') as keyof typeof horizontalPaddingClass;

  const parentPath = content.parent?.url?.default;
  const allArticles = parentPath ? await getArticlesUnder(parentPath, locale) : [];
  const skip = Math.max(0, content.skip ?? 0);
  const afterSkip = skip > 0 ? allArticles.slice(skip) : allArticles;
  const articles = content.maxItems ? afterSkip.slice(0, content.maxItems) : afterSkip;

  const hasHeader = Boolean(content.heading || content.subheading);

  return (
    <section className={cn(surfaceClass[surface], verticalPaddingClass[verticalPadding])}>
      <Container className={cn('max-w-5xl', horizontalPaddingClass[horizontalPadding])}>
        {hasHeader && (
          <div className="max-w-3xl mb-8 md:mb-12">
            {content.heading && (
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight" {...pa('heading')}>
                {content.heading}
              </h2>
            )}
            {content.subheading && (
              <p className="mt-4 text-lg text-muted-foreground" {...pa('subheading')}>
                {content.subheading}
              </p>
            )}
          </div>
        )}

        {!parentPath ? (
          <div
            className="border border-dashed border-border p-8 text-center text-sm text-muted-foreground rounded-lg"
            {...pa('parent')}
          >
            Select a parent page to list articles from.
          </div>
        ) : articles.length === 0 ? (
          <div className="border border-dashed border-border p-8 text-center text-sm text-muted-foreground rounded-lg">
            No articles found under {parentPath}.
          </div>
        ) : layout === 'grid' ? (
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {articles.map((article) => (
              <ArticleCard key={article._metadata?.key} article={article} locale={locale} />
            ))}
          </div>
        ) : (
          <ul
            className={cn(
              'divide-y divide-border border-b border-border',
              hasHeader && 'border-t',
            )}
          >
            {articles.map((article) => (
              <li key={article._metadata?.key}>
                <ArticleListRow article={article} locale={locale} readMoreLabel={readMoreLabel} />
              </li>
            ))}
          </ul>
        )}
      </Container>
    </section>
  );
}

function formatDate(iso: string | null | undefined, locale: string): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

function ArticleListRow({
  article,
  locale,
  readMoreLabel,
}: {
  article: ArticleListItem;
  locale: string;
  readMoreLabel: string;
}) {
  const href = article._metadata?.url?.default ?? '#';
  const heading = article.heading ?? article._metadata?.displayName ?? 'Untitled';
  const imgUrl = article.featuredImage?.url?.default;
  const dateLabel = formatDate(article._metadata?.published, locale);

  return (
    <Link
      href={href}
      className="group flex flex-col sm:flex-row gap-6 py-5 md:py-6 hover:opacity-90 transition-opacity"
    >
      {imgUrl && (
        <div className="relative w-full sm:w-40 md:w-48 aspect-[4/3] flex-shrink-0 overflow-hidden bg-muted rounded-md">
          <Image
            src={imgUrl}
            alt={heading}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 640px) 100vw, 192px"
          />
        </div>
      )}
      <div className="flex-1 min-w-0">
        {dateLabel && (
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
            <time dateTime={article._metadata?.published ?? undefined}>{dateLabel}</time>
          </div>
        )}
        <h3 className="text-xl md:text-2xl font-semibold tracking-tight group-hover:text-brand transition-colors">
          {heading}
        </h3>
        {article.ingress && (
          <p className="mt-2 text-base text-muted-foreground line-clamp-3">{article.ingress}</p>
        )}
        <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-brand group-hover:gap-3 transition-all">
          {readMoreLabel}
          <ArrowRight className="w-4 h-4" aria-hidden />
        </span>
      </div>
    </Link>
  );
}

function ArticleCard({ article, locale }: { article: ArticleListItem; locale: string }) {
  const href = article._metadata?.url?.default ?? '#';
  const heading = article.heading ?? article._metadata?.displayName ?? 'Untitled';
  const imgUrl = article.featuredImage?.url?.default;
  const dateLabel = formatDate(article._metadata?.published, locale);

  return (
    <Link
      href={href}
      className="group flex flex-col bg-card text-card-foreground border border-border rounded-lg overflow-hidden hover:border-foreground/40 transition-colors"
    >
      {imgUrl && (
        <div className="relative w-full aspect-[16/9] overflow-hidden bg-muted">
          <Image
            src={imgUrl}
            alt={heading}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        </div>
      )}
      <div className="flex flex-col flex-1 p-6">
        {dateLabel && (
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
            <time dateTime={article._metadata?.published ?? undefined}>{dateLabel}</time>
          </div>
        )}
        <h3 className="text-xl font-semibold tracking-tight group-hover:text-brand transition-colors">
          {heading}
        </h3>
        {article.ingress && (
          <p className="mt-2 text-sm text-muted-foreground line-clamp-3">{article.ingress}</p>
        )}
      </div>
    </Link>
  );
}
