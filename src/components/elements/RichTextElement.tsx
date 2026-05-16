import { ContentProps } from '@optimizely/cms-sdk';
import { RichText } from '@optimizely/cms-sdk/react/richText';
import { getPreviewUtils } from '@optimizely/cms-sdk/react/server';
import { RichTextElementCT } from '@/content-types/RichTextElement';
import { Prose } from '@/components/ui';

type Props = {
  content: ContentProps<typeof RichTextElementCT>;
};

export default function RichTextElement({ content }: Props) {
  const { pa } = getPreviewUtils(content);

  return (
    <Prose {...pa('content')}>
      <RichText content={content.content?.json} />
    </Prose>
  );
}
