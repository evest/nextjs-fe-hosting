import { ContentProps } from '@optimizely/cms-sdk';
import { getPreviewUtils } from '@optimizely/cms-sdk/react/server';
import { AccordionBlockCT } from '@/content-types/AccordionBlock';
import { AccordionBlockDisplayTemplate } from '@/display-templates/AccordionBlockDisplayTemplate';
import AccordionItem from '@/components/elements/AccordionItem';
import { Container } from '@/components/ui';
import { cn } from '@/lib/utils';

type Props = {
  content: ContentProps<typeof AccordionBlockCT>;
  displaySettings?: ContentProps<typeof AccordionBlockDisplayTemplate>;
};

const surfaceClass = {
  light: 'bg-background text-foreground',
  muted: 'section-muted bg-background text-foreground',
  dark: 'section-dark bg-background text-foreground',
};

export default function AccordionBlock({ content, displaySettings }: Props) {
  const { pa } = getPreviewUtils(content);
  const surface = (displaySettings?.surface ?? 'light') as keyof typeof surfaceClass;
  const items = content.items ?? [];

  return (
    <section className={cn(surfaceClass[surface], 'py-16 md:py-24')}>
      <Container className="max-w-3xl">
        {(content.heading || content.subheading) && (
          <div className="mb-10 md:mb-12">
            {content.heading && (
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight" {...pa('heading')}>
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
        <div className="border-t border-border" {...pa('items')}>
          {items.map((item, i) => (
            <AccordionItem key={i} content={item} />
          ))}
        </div>
      </Container>
    </section>
  );
}
