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
      light: `inline-block bg-white text-black px-6 py-3 rounded-lg font-semibold
              hover:bg-gray-100 transition-colors`,
      dark: `inline-block bg-black text-white px-6 py-3 rounded-lg font-semibold
             hover:bg-gray-800 transition-colors`,
    },
    link: {
      light: `inline-block text-white font-semibold underline underline-offset-4
              hover:text-gray-200 transition-colors`,
      dark: `inline-block text-black font-semibold underline underline-offset-4
             hover:text-gray-800 transition-colors`,
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
