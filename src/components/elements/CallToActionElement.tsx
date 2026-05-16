import { ContentProps } from '@optimizely/cms-sdk';
import { getPreviewUtils } from '@optimizely/cms-sdk/react/server';
import { CallToActionElementCT } from '@/content-types/CallToActionElement';
import { CallToActionDisplayTemplate } from '@/display-templates/CallToActionElementDisplayTemplate';
import { buttonVariants, type ButtonVariantProps } from '@/components/ui';
import Link from 'next/link';

type Props = {
  content: ContentProps<typeof CallToActionElementCT>;
  displaySettings?: ContentProps<typeof CallToActionDisplayTemplate>;
};

export default function CallToActionElement({ content, displaySettings }: Props) {
  const { pa } = getPreviewUtils(content);

  const variant = (displaySettings?.style ?? 'link') as ButtonVariantProps['variant'];
  const tone = (displaySettings?.color ?? 'dark') as ButtonVariantProps['tone'];
  const className = buttonVariants({ variant, tone });

  if (!content.link?.url?.default) {
    return (
      <span className={className} {...pa('link')}>
        Set link...
      </span>
    );
  }

  return (
    <Link
      href={content.link.url.default}
      className={className}
      target={content.link.target ?? undefined}
      title={content.link.title ?? undefined}
      {...pa('link')}
    >
      {content.link.text || 'Learn More'}
    </Link>
  );
}
