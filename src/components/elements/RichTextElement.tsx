import { ContentProps } from '@optimizely/cms-sdk';
import { RichText } from '@optimizely/cms-sdk/react/richText';
import { getPreviewUtils } from '@optimizely/cms-sdk/react/server';
import { RichTextElementCT } from '@/content-types/RichTextElement';

type Props = {
  content: ContentProps<typeof RichTextElementCT>;
};

export default function RichTextElement({ content }: Props) {
  const { pa } = getPreviewUtils(content);

  return (
    <div className="prose prose-lg max-w-none" {...pa('content')}>
      <RichText content={content.content?.json} />
    </div>
  );
}
