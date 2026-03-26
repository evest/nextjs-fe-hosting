import { ContentProps, damAssets } from '@optimizely/cms-sdk';
import { RichText } from '@optimizely/cms-sdk/react/richText';
import { getPreviewUtils } from '@optimizely/cms-sdk/react/server';
import { CardBlockCT } from '@/content-types/CardBlock';
import Image from 'next/image';

type Props = {
  content: ContentProps<typeof CardBlockCT>;
};

export default function CardBlock({ content }: Props) {
  const { pa, src } = getPreviewUtils(content);
  const { getAlt } = damAssets(content);

  return (
    <div className="bg-card rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
      {src(content.image) && (
        <div className="relative h-48 w-full">
          <Image
            src={src(content.image)!}
            alt={getAlt(content.image, 'Card image')}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            {...pa('image')}
          />
        </div>
      )}

      <div className="p-6">
        <h3
          className="text-xl font-semibold text-card-foreground mb-2"
          {...pa('title')}
        >
          {content.title}
        </h3>

        {content.text && (
          <div className="prose prose-sm text-muted-foreground mb-4" {...pa('text')}>
            <RichText content={content.text?.json} />
          </div>
        )}

        {content.linkUrl && content.linkText && (
          <a
            href={String(content.linkUrl)}
            className="inline-flex items-center text-accent hover:text-accent/80 font-medium"
            {...pa('linkUrl')}
          >
            {content.linkText}
            <svg
              className="ml-2 w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </a>
        )}
      </div>
    </div>
  );
}
