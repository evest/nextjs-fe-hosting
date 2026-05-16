import { ContentProps } from '@optimizely/cms-sdk';
import { getPreviewUtils } from '@optimizely/cms-sdk/react/server';
import { TextElementCT } from '@/content-types/TextElement';
import { TextElementDisplayTemplate } from '@/display-templates/TextElementDisplayTemplate';
import { Heading } from '@/components/ui';

type Props = {
  content: ContentProps<typeof TextElementCT>;
  displaySettings?: ContentProps<typeof TextElementDisplayTemplate>;
};

type Level = 'plain' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5';
type Align = 'left' | 'center' | 'right';

const alignClass: Record<Align, string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};

export default function TextElement({ content, displaySettings }: Props) {
  const { pa } = getPreviewUtils(content);
  const level = (displaySettings?.headingLevel ?? 'plain') as Level;
  const align = (displaySettings?.alignment ?? 'left') as Align;

  return (
    <Heading level={level} className={alignClass[align]} {...pa('text')}>
      {content.text}
    </Heading>
  );
}
