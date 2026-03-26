import { ContentProps } from '@optimizely/cms-sdk';
import { getPreviewUtils } from '@optimizely/cms-sdk/react/server';
import { CallToActionElementCT } from '@/content-types/CallToActionElement';
import { CallToActionDisplayTemplate } from '@/display-templates/CallToActionElementDisplayTemplate';
import Link from 'next/link';

type Props = {
  content: ContentProps<typeof CallToActionElementCT>;
  displaySettings?: ContentProps<typeof CallToActionDisplayTemplate>;
};

export default function CallToActionElement({ content, displaySettings }: Props) {
  const { pa } = getPreviewUtils(content);

  const style = displaySettings?.style ?? 'link';
  const color = displaySettings?.color ?? 'dark';

  const styleClasses: Record<string, Record<string, string>> = {
    button: {
      light: `inline-block bg-primary-foreground text-primary px-6 py-3 rounded-lg font-semibold
              hover:opacity-90 transition-opacity`,
      dark: `inline-block bg-primary text-primary-foreground px-6 py-3 rounded-lg font-semibold
             hover:opacity-90 transition-opacity`,
    },
    link: {
      light: `inline-block text-primary-foreground font-semibold underline underline-offset-4
              hover:opacity-80 transition-opacity`,
      dark: `inline-block text-primary font-semibold underline underline-offset-4
             hover:opacity-80 transition-opacity`,
    },
  };

  if (!content.link?.url?.default) {
    return (
      <span className={styleClasses[style][color]} {...pa('link')}>
        Set link...
      </span>
    );
  }

  return (
    <Link
      href={content.link.url.default}
      className={styleClasses[style][color]}
      target={content.link.target ?? undefined}
      title={content.link.title ?? undefined}
      {...pa('link')}
    >
      {content.link.text || 'Learn More'}
    </Link>
  );
}
