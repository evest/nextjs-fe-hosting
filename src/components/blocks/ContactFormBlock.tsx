import { ContentProps } from '@optimizely/cms-sdk';
import { getPreviewUtils } from '@optimizely/cms-sdk/react/server';
import { getTranslations } from 'next-intl/server';
import { ContactFormBlockCT } from '@/content-types/ContactFormBlock';
import { ContactFormBlockDisplayTemplate } from '@/display-templates/ContactFormBlockDisplayTemplate';
import { Container } from '@/components/ui';
import { cn } from '@/lib/utils';
import ContactFormFields from './ContactFormFields';
import ContactFormDialog from './ContactFormDialog';

type Props = {
  content: ContentProps<typeof ContactFormBlockCT>;
  displaySettings?: ContentProps<typeof ContactFormBlockDisplayTemplate>;
};

const surfaceClass = {
  light: 'bg-background text-foreground',
  muted: 'section-muted bg-background text-foreground',
  dark: 'section-dark bg-background text-foreground',
};

export default async function ContactFormBlock({ content, displaySettings }: Props) {
  const t = await getTranslations('ContactForm');
  const { pa } = getPreviewUtils(content);
  const surface = (displaySettings?.surface ?? 'muted') as keyof typeof surfaceClass;
  const alignment = displaySettings?.alignment ?? 'left';
  const isCenter = alignment === 'center';
  const asPopup = !!content.asPopup;
  const popupLabel = content.popupButtonLabel || t('openFormButton');

  return (
    <section className={cn(surfaceClass[surface], 'py-16 md:py-24')}>
      <Container className={cn('max-w-3xl', isCenter && 'text-center')}>
        {(content.heading || content.description) && (
          <div className="mb-10">
            {content.heading && (
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight" {...pa('heading')}>
                {content.heading}
              </h2>
            )}
            {content.description && (
              <p className="mt-4 text-lg text-muted-foreground" {...pa('description')}>
                {content.description}
              </p>
            )}
          </div>
        )}

        {asPopup ? (
          <div className={isCenter ? 'flex justify-center' : ''} {...pa('popupButtonLabel')}>
            <ContactFormDialog
              buttonLabel={popupLabel}
              heading={content.heading ?? undefined}
              description={content.description ?? undefined}
            />
          </div>
        ) : (
          <div className="bg-card text-card-foreground p-6 md:p-10 border border-border rounded-lg">
            <ContactFormFields variant="inline" />
          </div>
        )}
      </Container>
    </section>
  );
}
