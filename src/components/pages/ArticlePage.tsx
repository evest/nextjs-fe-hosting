import { Infer } from '@optimizely/cms-sdk';
import { RichText } from '@optimizely/cms-sdk/react/richText';
import { getPreviewUtils } from '@optimizely/cms-sdk/react/server';
import { ArticlePageCT } from '@/content-types/ArticlePage';
import Image from 'next/image';

type Props = {
  opti: Infer<typeof ArticlePageCT>;
};

export default function ArticlePage({ opti }: Props) {
  const { pa, src } = getPreviewUtils(opti);

  return (
    <article className="max-w-4xl mx-auto px-4 py-8">
      {(opti.featuredImage?.url?.default || opti.featuredImage?.item?.Url) && (
        <div className="relative w-full h-64 md:h-96 mb-8 rounded-lg overflow-hidden">
          <Image
            src={src(opti.featuredImage)}
            alt={opti.heading || 'Featured image'}
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
        {opti.heading}
      </h1>

      {opti.body && (
        <div className="prose prose-lg max-w-none" {...pa('body')}>
          <RichText content={opti.body?.json} />
        </div>
      )}
    </article>
  );
}
