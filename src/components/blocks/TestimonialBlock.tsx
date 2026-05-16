import { ContentProps, damAssets } from '@optimizely/cms-sdk';
import { getPreviewUtils } from '@optimizely/cms-sdk/react/server';
import Image from 'next/image';
import { Quote } from 'lucide-react';
import { TestimonialBlockCT } from '@/content-types/TestimonialBlock';
import { TestimonialBlockDisplayTemplate } from '@/display-templates/TestimonialBlockDisplayTemplate';
import { Container } from '@/components/ui';
import { cn } from '@/lib/utils';

type Props = {
  content: ContentProps<typeof TestimonialBlockCT>;
  displaySettings?: ContentProps<typeof TestimonialBlockDisplayTemplate>;
};

const surfaceClass = {
  light: 'bg-background text-foreground',
  muted: 'section-muted bg-background text-foreground',
  dark: 'section-dark bg-background text-foreground',
};

export default function TestimonialBlock({ content, displaySettings }: Props) {
  const { pa, src } = getPreviewUtils(content);
  const { getAlt } = damAssets(content);
  const surface = (displaySettings?.surface ?? 'muted') as keyof typeof surfaceClass;
  const layout = displaySettings?.layout ?? 'grid';

  const items = [
    { key: 1 as const, quote: content.quote1, name: content.author1Name, role: content.author1Role, company: content.author1Company, image: content.author1Image },
    { key: 2 as const, quote: content.quote2, name: content.author2Name, role: content.author2Role, company: content.author2Company, image: content.author2Image },
    { key: 3 as const, quote: content.quote3, name: content.author3Name, role: content.author3Role, company: content.author3Company, image: content.author3Image },
  ].filter((item) => item.quote);

  const visibleItems = layout === 'single' ? items.slice(0, 1) : items;
  const isSingle = layout === 'single' || visibleItems.length === 1;

  return (
    <section className={cn(surfaceClass[surface], 'py-16 md:py-24')}>
      <Container>
        {(content.heading || content.subheading) && (
          <div className="max-w-3xl mb-12 md:mb-16">
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

        <div className={isSingle ? 'max-w-3xl mx-auto' : 'grid gap-8 md:grid-cols-2 lg:grid-cols-3'}>
          {visibleItems.map((item) => {
            const imgSrc = src(item.image);
            return (
              <figure
                key={item.key}
                className={cn(
                  'relative bg-card text-card-foreground p-8 md:p-10 border border-border rounded-lg',
                  isSingle && 'text-center'
                )}
              >
                <Quote className="absolute top-6 right-6 w-8 h-8 text-accent opacity-30" aria-hidden strokeWidth={1.5} />
                <blockquote
                  className={cn('text-lg md:text-xl leading-relaxed', isSingle && 'md:text-2xl')}
                  {...pa(`quote${item.key}`)}
                >
                  &ldquo;{item.quote}&rdquo;
                </blockquote>
                {(item.name || item.role || item.company || imgSrc) && (
                  <figcaption className={cn('mt-8 flex items-center gap-4', isSingle && 'justify-center')}>
                    {imgSrc && (
                      <div className="relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
                        <Image src={imgSrc} alt={getAlt(item.image, item.name ?? '')} fill sizes="48px" className="object-cover" />
                      </div>
                    )}
                    <div className="text-left">
                      {item.name && (
                        <div className="font-semibold" {...pa(`author${item.key}Name`)}>
                          {item.name}
                        </div>
                      )}
                      {(item.role || item.company) && (
                        <div className="text-sm text-muted-foreground">
                          {item.role && <span {...pa(`author${item.key}Role`)}>{item.role}</span>}
                          {item.role && item.company && ', '}
                          {item.company && <span {...pa(`author${item.key}Company`)}>{item.company}</span>}
                        </div>
                      )}
                    </div>
                  </figcaption>
                )}
              </figure>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
