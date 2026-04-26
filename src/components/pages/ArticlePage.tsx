import { ContentProps, damAssets } from '@optimizely/cms-sdk';
import { RichText } from '@optimizely/cms-sdk/react/richText';
import { getPreviewUtils } from '@optimizely/cms-sdk/react/server';
import { ArticlePageCT } from '@/content-types/ArticlePage';
import Image from 'next/image';
import { link } from 'fs';

type Props = {
  content: ContentProps<typeof ArticlePageCT>;
};

export default function ArticlePage({ content }: Props) {
  const { pa, src } = getPreviewUtils(content);
  const { getAlt } = damAssets(content);

  return (
    <article className="max-w-4xl mx-auto px-4 py-8">
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

      <h1
        className="text-3xl md:text-4xl font-bold text-foreground mb-6"
        {...pa('heading')}
         data-epi-edit='heading'
      >
        {content.heading}
      </h1>

      {content.ingress && (
        <p
          className="text-xl md:text-2xl text-muted-foreground leading-relaxed mb-8"
          {...pa('ingress')}
        >
          {content.ingress}
        </p>
      )}

      {content.body && (
        <div className="prose prose-lg max-w-none" {...pa('body')}>
          <RichText content={content.body?.json} />
        </div>
      )}
    </article>
  );
}
