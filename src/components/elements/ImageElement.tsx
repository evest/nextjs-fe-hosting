import { ContentProps } from '@optimizely/cms-sdk';
import { getPreviewUtils } from '@optimizely/cms-sdk/react/server';
import { ImageElementCT } from '@/content-types/ImageElement';
import { ImageDisplayTemplate } from '@/display-templates';
import Image from 'next/image';

type Props = {
  content: ContentProps<typeof ImageElementCT>;
  displaySettings?: ContentProps<typeof ImageDisplayTemplate>;
};

export default function ImageElement({ content, displaySettings }: Props) {
  const { pa, src } = getPreviewUtils(content);

  if (!content.image?.url?.default && !content.image?.item?.Url) {
    return null;
  }

  // Get display settings with defaults
  const alignment = displaySettings?.alignment ?? 'center';
  const size = displaySettings?.size ?? 'medium';
  const aspectRatio = displaySettings?.aspectRatio ?? 'auto';
  const borderRadius = displaySettings?.borderRadius ?? 'medium';
  const shadow = displaySettings?.shadow ?? 'none';
  const verticalAlignment = displaySettings?.verticalAlignment ?? 'center';
  const spacing = displaySettings?.spacing ?? 'small';

  // Alignment classes
  const alignmentClasses = {
    left: 'mr-auto',
    center: 'mx-auto',
    right: 'ml-auto',
    full: 'w-full',
  };

  // Size classes (max-width)
  const sizeClasses = {
    small: 'max-w-xs',    // 300px
    medium: 'max-w-lg',   // 500px
    large: 'max-w-3xl',   // 800px
    full: 'w-full',
  };

  // Aspect ratio classes
  const aspectRatioClasses = {
    auto: 'h-64 md:h-80',  // Fixed height for auto (original behavior)
    square: 'aspect-square',
    video: 'aspect-video',      // 16:9
    standard: 'aspect-[4/3]',
    classic: 'aspect-[3/2]',
    ultrawide: 'aspect-[21/9]',
  };

  // Border radius classes
  const borderRadiusClasses = {
    none: 'rounded-none',
    small: 'rounded-sm',
    medium: 'rounded-lg',
    large: 'rounded-2xl',
    full: 'rounded-full',
  };

  // Shadow classes
  const shadowClasses = {
    none: '',
    small: 'shadow-sm',
    medium: 'shadow-md',
    large: 'shadow-xl',
  };

  // Vertical alignment classes (object-position for the image)
  const verticalAlignmentClasses = {
    top: 'object-top',
    center: 'object-center',
    bottom: 'object-bottom',
  };

  // Spacing classes (vertical margin)
  const spacingClasses = {
    none: 'my-0',
    small: 'my-2',
    medium: 'my-4',
    large: 'my-8',
    xlarge: 'my-12',
  };

  // Caption alignment based on image alignment
  const captionAlignmentClasses = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
    full: 'text-center',
  };

  return (
    <figure className={spacingClasses[spacing]}>
      <div
        className={`
          relative
          w-full
          ${alignmentClasses[alignment]}
          ${sizeClasses[size]}
          ${aspectRatioClasses[aspectRatio]}
          ${borderRadiusClasses[borderRadius]}
          ${shadowClasses[shadow]}
          overflow-hidden
        `.trim().replace(/\s+/g, ' ')}
      >
        <Image
          src={src(content.image)}
          alt={content.altText || ''}
          fill
          className={`object-cover ${verticalAlignmentClasses[verticalAlignment]}`}
          {...pa('image')}
        />
      </div>
      {content.caption && (
        <figcaption
          className={`mt-2 text-sm text-gray-500 italic ${captionAlignmentClasses[alignment]}`}
          {...pa('caption')}
        >
          {content.caption}
        </figcaption>
      )}
    </figure>
  );
}
