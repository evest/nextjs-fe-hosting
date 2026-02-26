import { ContentProps } from '@optimizely/cms-sdk';
import { getPreviewUtils } from '@optimizely/cms-sdk/react/server';
import { TextElementCT } from '@/content-types/TextElement';
import { TextElementDisplayTemplate } from '@/display-templates/TextElementDisplayTemplate';

type Props = {
  content: ContentProps<typeof TextElementCT>;
  displaySettings?: ContentProps<typeof TextElementDisplayTemplate>;
};

export default function TextElement({ content, displaySettings }: Props) {
  const { pa } = getPreviewUtils(content);

  const headingLevel = displaySettings?.headingLevel || 'plain';
  const alignment = displaySettings?.alignment || 'left';

  const alignmentClasses: Record<string, string> = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  };

  const baseClasses = alignmentClasses[alignment];

  switch (headingLevel) {
    case 'h1':
      return (
        <h1
          className={`text-4xl font-bold text-gray-900 ${baseClasses}`}
          {...pa('text')}
        >
          {content.text}
        </h1>
      );
    case 'h2':
      return (
        <h2
          className={`text-3xl font-bold text-gray-800 ${baseClasses}`}
          {...pa('text')}
        >
          {content.text}
        </h2>
      );
    case 'h3':
      return (
        <h3
          className={`text-2xl font-semibold text-gray-800 ${baseClasses}`}
          {...pa('text')}
        >
          {content.text}
        </h3>
      );
    case 'h4':
      return (
        <h4
          className={`text-xl font-semibold text-gray-700 ${baseClasses}`}
          {...pa('text')}
        >
          {content.text}
        </h4>
      );
    case 'h5':
      return (
        <h5
          className={`text-lg font-medium text-gray-700 ${baseClasses}`}
          {...pa('text')}
        >
          {content.text}
        </h5>
      );
    default:
      return (
        <p className={`text-base text-gray-600 ${baseClasses}`} {...pa('text')}>
          {content.text}
        </p>
      );
  }
}
