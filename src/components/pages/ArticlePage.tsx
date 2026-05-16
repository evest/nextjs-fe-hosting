import { ContentProps, damAssets } from '@optimizely/cms-sdk';
import { RichText } from '@optimizely/cms-sdk/react/richText';
import { getPreviewUtils } from '@optimizely/cms-sdk/react/server';
import { ArticlePageCT } from '@/content-types/ArticlePage';
import { Container, Heading, Prose } from '@/components/ui';
import { decodeRichTextEntities } from '@/lib/rich-text';
import Image from 'next/image';

type Props = {
  content: ContentProps<typeof ArticlePageCT>;
};

export default function ArticlePage({ content }: Props) {
  const { pa, src } = getPreviewUtils(content);
  const { getAlt } = damAssets(content);

  return (
    <Container size="narrow" className="py-8">
      <article>
        {src(content.featuredImage) && (
          <div className="relative w-full h-64 md:h-96 mb-8 rounded-lg overflow-hidden">
            <Image
              src={src(content.featuredImage)!}
              alt={getAlt(content.featuredImage, 'Featured image')}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 896px"
              {...pa('featuredImage')}
            />
          </div>
        )}

        <Heading level="h1" className="text-3xl md:text-4xl mb-6" {...pa('heading')}>
          {content.heading}
        </Heading>

        {content.ingress && (
          <p
            className="text-xl md:text-2xl text-muted-foreground leading-relaxed mb-8"
            {...pa('ingress')}
          >
            {content.ingress}
          </p>
        )}

        {content.body && (
          <Prose {...pa('body')}>
            <RichText content={decodeRichTextEntities(content.body?.json)} />
          </Prose>
        )}
      </article>
    </Container>
  );
}
