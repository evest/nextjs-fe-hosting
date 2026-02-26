import { ContentProps } from '@optimizely/cms-sdk';
import { RichText } from '@optimizely/cms-sdk/react/richText';
import { getPreviewUtils } from '@optimizely/cms-sdk/react/server';
import { ArticlePageCT } from '@/content-types/ArticlePage';
import Image from 'next/image';

type Props = {
  content: ContentProps<typeof ArticlePageCT>;
};

export default function ArticlePage({ content }: Props) {
  const { pa, src } = getPreviewUtils(content);

  return (
    <article className="max-w-4xl mx-auto px-4 py-8">
      {(content.featuredImage?.url?.default || content.featuredImage?.item?.Url) && (
        <div className="relative w-full h-64 md:h-96 mb-8 rounded-lg overflow-hidden">
          <Image
            src={src(content.featuredImage)}
            alt={content.heading || 'Featured image'}
            fill
            className="object-cover"
            {...pa('featuredImage')}
          />
        </div>
      )}

      <h1
        className="text-3xl md:text-4xl font-bold text-gray-900 mb-6"
        {...pa('heading')}
      >
        {content.heading}
      </h1>

      {content.body && (
        <div className="prose prose-lg max-w-none" {...pa('body')}>
          <RichText content={content.body?.json} />
        </div>
      )}
    </article>
  );
}
