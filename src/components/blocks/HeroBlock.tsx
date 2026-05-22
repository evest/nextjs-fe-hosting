import { ContentProps, damAssets } from '@optimizely/cms-sdk';
import { getPreviewUtils } from '@optimizely/cms-sdk/react/server';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { HeroBlockCT } from '@/content-types/HeroBlock';
import { HeroBlockDisplayTemplate } from '@/display-templates/HeroBlockDisplayTemplate';
import { Container } from '@/components/ui';
import { cn } from '@/lib/utils';

type Props = {
  content: ContentProps<typeof HeroBlockCT>;
  displaySettings?: ContentProps<typeof HeroBlockDisplayTemplate>;
};

const heightClass = {
  compact: 'min-h-[420px] py-16 md:py-20',
  standard: 'min-h-[560px] py-20 md:py-28',
  tall: 'min-h-[680px] py-24 md:py-36',
};

const dimClass = {
  none: '',
  subtle: 'bg-black/20',
  medium: 'bg-black/40',
  strong: 'bg-black/60',
};

const surfaceClass = {
  dark: 'section-dark bg-background text-foreground',
  light: 'bg-background text-foreground',
  muted: 'section-muted bg-background text-foreground',
  image: 'text-white',
};

export default function HeroBlock({ content, displaySettings }: Props) {
  const t = useTranslations('Cta');
  const { pa, src } = getPreviewUtils(content);
  const { getAlt } = damAssets(content);

  const surface = (displaySettings?.surface ?? 'dark') as keyof typeof surfaceClass;
  const height = (displaySettings?.height ?? 'standard') as keyof typeof heightClass;
  const alignment = displaySettings?.alignment ?? 'left';
  const imageDim = (displaySettings?.imageDim ?? 'medium') as keyof typeof dimClass;

  const showImage = surface === 'image' && !!src(content.backgroundImage);
  const alignClass = alignment === 'center' ? 'items-center text-center mx-auto' : 'items-start text-left';

  return (
    <section className={cn('relative w-full overflow-hidden', surfaceClass[surface], heightClass[height])}>
      {showImage && (
        <>
          <Image
            src={src(content.backgroundImage)!}
            alt={getAlt(content.backgroundImage, '')}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          {dimClass[imageDim] && (
            <div aria-hidden className={cn('absolute inset-0', dimClass[imageDim])} />
          )}
        </>
      )}

      <Container className="relative z-10 h-full flex">
        <div className={cn('flex flex-col justify-center max-w-3xl', alignClass)}>
          {content.eyebrow && (
            <span
              className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-highlight"
              {...pa('eyebrow')}
            >
              {content.eyebrow}
            </span>
          )}
          <h1
            className="text-4xl sm:text-5xl md:text-6xl font-bold leading-[1.05] tracking-tight"
            {...pa('headline')}
          >
            {content.headline}
          </h1>
          {content.subline && (
            <p className="mt-6 text-lg md:text-xl opacity-90 max-w-2xl" {...pa('subline')}>
              {content.subline}
            </p>
          )}
          {(content.primaryCta?.url?.default || content.secondaryCta?.url?.default) && (
            <div className={cn('mt-10 flex flex-wrap gap-4', alignment === 'center' && 'justify-center')}>
              {content.primaryCta?.url?.default && (
                <Link
                  href={content.primaryCta.url.default}
                  target={content.primaryCta.target ?? undefined}
                  className="inline-flex items-center bg-brand text-brand-foreground font-semibold px-7 py-3.5 rounded-md hover:opacity-90 transition-opacity"
                  {...pa('primaryCta')}
                >
                  {content.primaryCta.text || t('learnMore')}
                </Link>
              )}
              {content.secondaryCta?.url?.default && (
                <Link
                  href={content.secondaryCta.url.default}
                  target={content.secondaryCta.target ?? undefined}
                  className="inline-flex items-center font-semibold px-7 py-3.5 rounded-md border border-current hover:bg-foreground hover:text-background transition-colors"
                  {...pa('secondaryCta')}
                >
                  {content.secondaryCta.text || t('contactUs')}
                  <ArrowRight className="ml-2 w-4 h-4" aria-hidden />
                </Link>
              )}
            </div>
          )}
        </div>
      </Container>
    </section>
  );
}
