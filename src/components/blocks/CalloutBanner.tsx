import { ContentProps } from '@optimizely/cms-sdk';
import { getPreviewUtils } from '@optimizely/cms-sdk/react/server';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { CalloutBannerCT } from '@/content-types/CalloutBanner';
import { CalloutBannerDisplayTemplate } from '@/display-templates/CalloutBannerDisplayTemplate';
import { Container } from '@/components/ui';
import { cn } from '@/lib/utils';

type Props = {
  content: ContentProps<typeof CalloutBannerCT>;
  displaySettings?: ContentProps<typeof CalloutBannerDisplayTemplate>;
};

const surfaceClass = {
  dark: 'section-dark bg-background text-foreground',
  light: 'bg-background text-foreground',
  muted: 'section-muted bg-background text-foreground',
};

export default function CalloutBanner({ content, displaySettings }: Props) {
  const t = useTranslations('Cta');
  const { pa } = getPreviewUtils(content);
  const surface = (displaySettings?.surface ?? 'dark') as keyof typeof surfaceClass;
  const alignment = displaySettings?.alignment ?? 'center';

  const isCenter = alignment === 'center';
  const primaryHref = content.primaryCta?.url?.default;
  const secondaryHref = content.secondaryCta?.url?.default;

  return (
    <section className={cn(surfaceClass[surface], 'py-16 md:py-24')}>
      <Container
        className={cn(
          isCenter
            ? 'text-center flex flex-col items-center'
            : 'md:flex md:items-center md:justify-between md:gap-12'
        )}
      >
        <div className={isCenter ? 'max-w-3xl' : 'md:flex-1 max-w-2xl'}>
          {content.eyebrow && (
            <div className="text-sm font-semibold uppercase tracking-[0.18em] text-highlight mb-4" {...pa('eyebrow')}>
              {content.eyebrow}
            </div>
          )}
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight leading-[1.05]" {...pa('headline')}>
            {content.headline}
          </h2>
          {content.description && (
            <p className={cn('mt-4 text-lg md:text-xl opacity-90', isCenter && 'mx-auto')} {...pa('description')}>
              {content.description}
            </p>
          )}
        </div>

        {(primaryHref || secondaryHref) && (
          <div className={cn('mt-8', isCenter ? 'flex flex-wrap justify-center gap-4' : 'md:mt-0 flex flex-wrap gap-4')}>
            {primaryHref && (
              <Link
                href={primaryHref}
                target={content.primaryCta?.target ?? undefined}
                className="inline-flex items-center bg-accent text-accent-foreground font-semibold px-7 py-3.5 rounded-md hover:opacity-90 transition-opacity"
                {...pa('primaryCta')}
              >
                {content.primaryCta?.text || t('contactUs')}
                <ArrowRight className="ml-2 w-4 h-4" aria-hidden />
              </Link>
            )}
            {secondaryHref && (
              <Link
                href={secondaryHref}
                target={content.secondaryCta?.target ?? undefined}
                className="inline-flex items-center font-semibold px-7 py-3.5 rounded-md border border-current hover:bg-foreground hover:text-background transition-colors"
                {...pa('secondaryCta')}
              >
                {content.secondaryCta?.text || t('learnMore')}
              </Link>
            )}
          </div>
        )}
      </Container>
    </section>
  );
}
