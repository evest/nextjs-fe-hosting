import { Infer } from '@optimizely/cms-sdk';
import { getPreviewUtils } from '@optimizely/cms-sdk/react/server';
import { BannerElementCT } from '@/content-types/BannerElement';
import { BannerDisplayTemplate } from '@/display-templates/BannerElementDisplayTemplate';
import Image from 'next/image';
import Link from 'next/link';

type Props = {
  opti: Infer<typeof BannerElementCT>;
  displaySettings?: Infer<typeof BannerDisplayTemplate>;
};

export default function BannerElement({ opti, displaySettings }: Props) {
  const { pa, src } = getPreviewUtils(opti);

  if (!opti.backgroundImage?.url?.default) {
    return null;
  }

  // Get display settings with defaults
  const headingTag = displaySettings?.headingTag ?? 'h2';
  const horizontalAlignment = displaySettings?.horizontalAlignment ?? 'center';
  const verticalAlignment = displaySettings?.verticalAlignment ?? 'center';
  const overlayKey = displaySettings?.overlayPercentage ?? 'overlay0';

  // Horizontal alignment classes
  const horizontalAlignmentClasses = {
    left: 'text-left items-start',
    center: 'text-center items-center',
    right: 'text-right items-end',
  };

  // Vertical alignment classes
  const verticalAlignmentClasses = {
    top: 'justify-start',
    center: 'justify-center',
    bottom: 'justify-end',
  };

  // Create heading element dynamically
  const HeadingTag = headingTag as keyof JSX.IntrinsicElements;

  // Extract numeric value from overlay key (e.g., 'overlay50' -> 50)
  const overlayPercentage = parseInt(overlayKey.replace('overlay', '')) || 0;
  const overlayOpacity = overlayPercentage / 100;

  return (
    <div className="relative w-full h-96 overflow-hidden">
      {/* Background Image */}
      <Image
        src={src(opti.backgroundImage)}
        alt=""
        fill
        className="object-cover"
        priority
      />

      {/* Overlay */}
      {overlayOpacity > 0 && (
        <div
          className="absolute inset-0 bg-black"
          style={{ opacity: overlayOpacity }}
          aria-hidden="true"
        />
      )}

      {/* Content Container */}
      <div
        className={`
          relative z-10 h-full
          flex flex-col
          ${verticalAlignmentClasses[verticalAlignment]}
          ${horizontalAlignmentClasses[horizontalAlignment]}
          px-6 py-8 md:px-12 md:py-16
        `.trim().replace(/\s+/g, ' ')}
      >
        <div className="max-w-4xl">
          {/* Heading */}
          <HeadingTag
            className="text-white font-bold text-3xl md:text-5xl mb-4"
            {...pa('heading')}
          >
            {opti.heading}
          </HeadingTag>

          {/* Text */}
          {opti.text && (
            <p
              className="text-white text-lg md:text-xl mb-6"
              {...pa('text')}
            >
              {opti.text}
            </p>
          )}

          {/* CTA Link */}
          {opti.ctaLink?.default?.href && (
            <Link
              href={opti.ctaLink.default.href}
              className="
                inline-block
                bg-white text-black
                px-6 py-3
                rounded-lg
                font-semibold
                hover:bg-gray-100
                transition-colors
              "
              target={opti.ctaLink.default.target}
              title={opti.ctaLink.default.title}
              {...pa('ctaLink')}
            >
              {opti.ctaLink.default.text || 'Learn More'}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
