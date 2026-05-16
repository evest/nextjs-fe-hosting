import { ContentProps, damAssets } from '@optimizely/cms-sdk';
import { getPreviewUtils } from '@optimizely/cms-sdk/react/server';
import { cva } from 'class-variance-authority';
import { BannerElementCT } from '@/content-types/BannerElement';
import { BannerDisplayTemplate } from '@/display-templates/BannerElementDisplayTemplate';
import { buttonVariants, Heading, type ButtonVariantProps } from '@/components/ui';
import Image from 'next/image';
import Link from 'next/link';

type Props = {
  content: ContentProps<typeof BannerElementCT>;
  displaySettings?: ContentProps<typeof BannerDisplayTemplate>;
};

type HeadingTag = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
type Horizontal = 'left' | 'center' | 'right';
type Vertical = 'top' | 'center' | 'bottom';

const layoutVariants = cva(
  'relative z-10 h-full flex flex-col px-6 py-8 md:px-12 md:py-16',
  {
    variants: {
      horizontal: {
        left: 'text-left items-start',
        center: 'text-center items-center',
        right: 'text-right items-end',
      },
      vertical: {
        top: 'justify-start',
        center: 'justify-center',
        bottom: 'justify-end',
      },
    },
  }
);

export default function BannerElement({ content, displaySettings }: Props) {
  const { pa, src } = getPreviewUtils(content);
  const { getAlt } = damAssets(content);

  if (!src(content.backgroundImage)) return null;

  const headingTag = (displaySettings?.headingTag ?? 'h2') as HeadingTag;
  const horizontal = (displaySettings?.horizontalAlignment ?? 'center') as Horizontal;
  const vertical = (displaySettings?.verticalAlignment ?? 'center') as Vertical;
  const overlayKey = displaySettings?.overlayPercentage ?? 'overlay0';
  const ctaVariant = (displaySettings?.ctaStyle ?? 'button') as ButtonVariantProps['variant'];
  const ctaTone = (displaySettings?.ctaColor ?? 'light') as ButtonVariantProps['tone'];

  const overlayOpacity = (parseInt(overlayKey.replace('overlay', '')) || 0) / 100;

  return (
    <div className="relative w-full h-96 overflow-hidden">
      <Image
        src={src(content.backgroundImage)!}
        alt={getAlt(content.backgroundImage, '')}
        fill
        className="object-cover"
        sizes="100vw"
        priority
      />

      {overlayOpacity > 0 && (
        <div
          className="absolute inset-0 bg-primary"
          style={{ opacity: overlayOpacity }}
          aria-hidden="true"
        />
      )}

      <div className={layoutVariants({ horizontal, vertical })}>
        <div className="max-w-4xl">
          <Heading
            level={headingTag}
            className="text-primary-foreground text-3xl md:text-5xl mb-4"
            {...pa('heading')}
          >
            {content.heading}
          </Heading>

          {content.text && (
            <p
              className="text-primary-foreground text-lg md:text-xl mb-6"
              {...pa('text')}
            >
              {content.text}
            </p>
          )}

          {content.ctaLink?.url?.default && (
            <Link
              href={content.ctaLink.url.default}
              className={buttonVariants({ variant: ctaVariant, tone: ctaTone })}
              target={content.ctaLink.target ?? undefined}
              title={content.ctaLink.title ?? undefined}
              {...pa('ctaLink')}
            >
              {content.ctaLink.text || 'Learn More'}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
