import { ContentProps, damAssets } from '@optimizely/cms-sdk';
import { RichText } from '@optimizely/cms-sdk/react/richText';
import { getPreviewUtils } from '@optimizely/cms-sdk/react/server';
import { CardBlockCT } from '@/content-types/CardBlock';
import { Card, CardBody, CardMedia, Heading, Prose } from '@/components/ui';
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
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
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
            <RichText content={content.text?.json} />
          </Prose>
        )}

        {content.linkUrl && content.linkText && (
          <a
            href={String(content.linkUrl)}
            className="inline-flex items-center text-accent hover:text-accent/80 font-medium"
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
