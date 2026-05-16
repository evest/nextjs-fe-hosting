import { ContentProps, damAssets } from '@optimizely/cms-sdk';
import { getPreviewUtils } from '@optimizely/cms-sdk/react/server';
import { cva } from 'class-variance-authority';
import { ImageElementCT } from '@/content-types/ImageElement';
import { ImageDisplayTemplate } from '@/display-templates';
import Image from 'next/image';

type Props = {
  content: ContentProps<typeof ImageElementCT>;
  displaySettings?: ContentProps<typeof ImageDisplayTemplate>;
};

type Alignment = 'left' | 'center' | 'right' | 'full';
type Size = 'small' | 'medium' | 'large' | 'full';
type AspectRatio = 'auto' | 'square' | 'video' | 'standard' | 'classic' | 'ultrawide';
type BorderRadius = 'none' | 'small' | 'medium' | 'large' | 'full';
type Shadow = 'none' | 'small' | 'medium' | 'large';
type VerticalAlignment = 'top' | 'center' | 'bottom';
type Spacing = 'none' | 'small' | 'medium' | 'large' | 'xlarge';

const figureVariants = cva('', {
  variants: {
    spacing: {
      none: 'my-0',
      small: 'my-2',
      medium: 'my-4',
      large: 'my-8',
      xlarge: 'my-12',
    },
  },
});

const frameVariants = cva('relative w-full overflow-hidden', {
  variants: {
    alignment: {
      left: 'mr-auto',
      center: 'mx-auto',
      right: 'ml-auto',
      full: 'w-full',
    },
    size: {
      small: 'max-w-xs',
      medium: 'max-w-lg',
      large: 'max-w-3xl',
      full: 'w-full',
    },
    aspectRatio: {
      auto: 'h-64 md:h-80',
      square: 'aspect-square',
      video: 'aspect-video',
      standard: 'aspect-[4/3]',
      classic: 'aspect-[3/2]',
      ultrawide: 'aspect-[21/9]',
    },
    borderRadius: {
      none: 'rounded-none',
      small: 'rounded-sm',
      medium: 'rounded-lg',
      large: 'rounded-2xl',
      full: 'rounded-full',
    },
    shadow: {
      none: '',
      small: 'shadow-sm',
      medium: 'shadow-md',
      large: 'shadow-xl',
    },
  },
});

const imageVariants = cva('object-cover', {
  variants: {
    verticalAlignment: {
      top: 'object-top',
      center: 'object-center',
      bottom: 'object-bottom',
    },
  },
});

const captionVariants = cva('mt-2 text-sm text-muted-foreground italic', {
  variants: {
    alignment: {
      left: 'text-left',
      center: 'text-center',
      right: 'text-right',
      full: 'text-center',
    },
  },
});

export default function ImageElement({ content, displaySettings }: Props) {
  const { pa, src } = getPreviewUtils(content);
  const { getAlt } = damAssets(content);

  if (!src(content.image)) return null;

  const alignment = (displaySettings?.alignment ?? 'center') as Alignment;
  const size = (displaySettings?.size ?? 'medium') as Size;
  const aspectRatio = (displaySettings?.aspectRatio ?? 'auto') as AspectRatio;
  const borderRadius = (displaySettings?.borderRadius ?? 'medium') as BorderRadius;
  const shadow = (displaySettings?.shadow ?? 'none') as Shadow;
  const verticalAlignment = (displaySettings?.verticalAlignment ?? 'center') as VerticalAlignment;
  const spacing = (displaySettings?.spacing ?? 'small') as Spacing;

  return (
    <figure className={figureVariants({ spacing })}>
      <div className={frameVariants({ alignment, size, aspectRatio, borderRadius, shadow })}>
        <Image
          src={src(content.image)!}
          alt={getAlt(content.image, content.altText || '')}
          fill
          className={imageVariants({ verticalAlignment })}
          sizes="(max-width: 768px) 100vw, 50vw"
          {...pa('image')}
        />
      </div>
      {content.caption && (
        <figcaption className={captionVariants({ alignment })} {...pa('caption')}>
          {content.caption}
        </figcaption>
      )}
    </figure>
  );
}
