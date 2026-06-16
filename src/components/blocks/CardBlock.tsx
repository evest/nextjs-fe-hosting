import { ContentProps, damAssets } from '@optimizely/cms-sdk';
import { RichText } from '@optimizely/cms-sdk/react/richText';
import { getPreviewUtils } from '@optimizely/cms-sdk/react/server';
import { CardBlockCT } from '@/content-types/CardBlock';
import { Card, CardBody, CardMedia, Heading, Prose } from '@/components/ui';
import { decodeRichTextEntities } from '@/lib/rich-text';
import { ArrowRight } from 'lucide-react';
import Image from 'next/image';

type Props = {
  content: ContentProps<typeof CardBlockCT>;
};

export default function CardBlock({ content }: Props) {
  const { pa, src } = getPreviewUtils(content);
  const { getAlt } = damAssets(content);

  return (
    <Card>
      {src(content.image) && (
        <CardMedia>
          <Image
            src={src(content.image)!}
            alt={getAlt(content.image, 'Card image')}
            fill
            className="object-cover"
            // Card grid is 1-col <640px, 2-col <1024px, 3-col above, inside a
            // max-w-7xl (1280px) Container — so a card never exceeds ~390px CSS
            // wide (3-col minus padding+gaps). Cap the top end at 400px instead
            // of 33vw, which on a wide screen overstated the box and pulled a
            // 750w+ render for a ~390px slot. Breakpoints match the real grid.
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px"
            {...pa('image')}
          />
        </CardMedia>
      )}

      <CardBody>
        <Heading level="h3" className="text-card-foreground mb-2" {...pa('title')}>
          {content.title}
        </Heading>

        {content.text && (
          <Prose size="sm" className="text-muted-foreground mb-4" {...pa('text')}>
            <RichText content={decodeRichTextEntities(content.text?.json)} />
          </Prose>
        )}

        {content.linkUrl && content.linkText && (
          <a
            href={String(content.linkUrl)}
            className="inline-flex items-center text-brand hover:text-brand/80 font-medium"
            {...pa('linkUrl')}
          >
            {content.linkText}
            <ArrowRight className="ml-2 w-4 h-4" />
          </a>
        )}
      </CardBody>
    </Card>
  );
}
