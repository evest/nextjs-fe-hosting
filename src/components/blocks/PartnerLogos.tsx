import { ContentProps, damAssets } from '@optimizely/cms-sdk';
import { getPreviewUtils } from '@optimizely/cms-sdk/react/server';
import Image from 'next/image';
import { PartnerLogosCT } from '@/content-types/PartnerLogos';
import { PartnerLogosDisplayTemplate } from '@/display-templates/PartnerLogosDisplayTemplate';
import { Container } from '@/components/ui';
import { cn } from '@/lib/utils';

type Props = {
  content: ContentProps<typeof PartnerLogosCT>;
  displaySettings?: ContentProps<typeof PartnerLogosDisplayTemplate>;
};

const surfaceClass = {
  light: 'bg-background text-foreground',
  muted: 'section-muted bg-background text-foreground',
  dark: 'section-dark bg-background text-foreground',
};

export default function PartnerLogos({ content, displaySettings }: Props) {
  const { pa, src } = getPreviewUtils(content);
  const { getAlt } = damAssets(content);
  const surface = (displaySettings?.surface ?? 'light') as keyof typeof surfaceClass;
  const treatment = displaySettings?.treatment ?? 'grayscale';
  const logos = content.logos ?? [];

  const logoClass =
    treatment === 'grayscale'
      ? 'opacity-60 grayscale hover:opacity-100 hover:grayscale-0 transition-all'
      : 'opacity-90 hover:opacity-100 transition-opacity';

  return (
    <section className={cn(surfaceClass[surface], 'py-16 md:py-20')}>
      <Container>
        {content.heading && (
          <h2
            className="text-sm md:text-base font-semibold uppercase tracking-[0.18em] text-center text-muted-foreground mb-10"
            {...pa('heading')}
          >
            {content.heading}
          </h2>
        )}
        <div
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-8 md:gap-12 items-center"
          {...pa('logos')}
        >
          {logos.map((logo, i) => {
            const url = src(logo);
            if (!url) return null;
            return (
              <div key={i} className="relative h-12 md:h-14">
                <Image
                  src={url}
                  alt={getAlt(logo, '')}
                  fill
                  className={cn('object-contain', logoClass)}
                  sizes="(min-width: 1024px) 16vw, (min-width: 768px) 25vw, 50vw"
                />
              </div>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
