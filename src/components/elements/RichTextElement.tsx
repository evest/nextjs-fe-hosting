import { Infer } from '@optimizely/cms-sdk';
import { RichText } from '@optimizely/cms-sdk/react/richText';
import { getPreviewUtils } from '@optimizely/cms-sdk/react/server';
import { RichTextElementCT } from '@/content-types/RichTextElement';

type Props = {
  opti: Infer<typeof RichTextElementCT>;
};

export default function RichTextElement({ opti }: Props) {
  const { pa } = getPreviewUtils(opti);

  return (
    <div className="prose prose-lg max-w-none" {...pa('content')}>
      <RichText content={opti.content?.json} />
    </div>
  );
}
