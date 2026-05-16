import { ContentProps } from '@optimizely/cms-sdk';
import { OptimizelyComponent, getPreviewUtils } from '@optimizely/cms-sdk/react/server';
import { SolutionsGridCT } from '@/content-types/SolutionsGrid';
import { SolutionsGridDisplayTemplate } from '@/display-templates/SolutionsGridDisplayTemplate';
import { Container } from '@/components/ui';
import { cn } from '@/lib/utils';

type Props = {
  content: ContentProps<typeof SolutionsGridCT>;
  displaySettings?: ContentProps<typeof SolutionsGridDisplayTemplate>;
};

const surfaceClass = {
  light: 'bg-background text-foreground',
  muted: 'section-muted bg-background text-foreground',
  dark: 'section-dark bg-background text-foreground',
};

const colsClass = {
  three: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  four: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
};

export default function SolutionsGrid({ content, displaySettings }: Props) {
  const { pa } = getPreviewUtils(content);
  const surface = (displaySettings?.surface ?? 'light') as keyof typeof surfaceClass;
  const columns = (displaySettings?.columns ?? 'three') as keyof typeof colsClass;
  const tiles = content.tiles ?? [];

  return (
    <section className={cn(surfaceClass[surface], 'py-16 md:py-24')} id="solutions">
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
        <div className={cn('grid gap-6', colsClass[columns])} {...pa('tiles')}>
          {tiles.map((tile, i) => (
            <OptimizelyComponent key={i} content={tile} />
          ))}
        </div>
      </Container>
    </section>
  );
}
