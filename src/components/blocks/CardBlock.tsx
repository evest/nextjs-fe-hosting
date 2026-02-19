import { Infer } from '@optimizely/cms-sdk';
import { RichText } from '@optimizely/cms-sdk/react/richText';
import { getPreviewUtils } from '@optimizely/cms-sdk/react/server';
import { CardBlockCT } from '@/content-types/CardBlock';
import Image from 'next/image';

type Props = {
  opti: Infer<typeof CardBlockCT>;
};

export default function CardBlock({ opti }: Props) {
  const { pa, src } = getPreviewUtils(opti);

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
      {(opti.image?.url?.default || opti.image?.item?.Url) && (
        <div className="relative h-48 w-full">
          <Image
            src={src(opti.image)}
            alt={opti.title || 'Card image'}
            fill
            className="object-cover"
            {...pa('image')}
          />
        </div>
      )}

      <div className="p-6">
        <h3
          className="text-xl font-semibold text-gray-900 mb-2"
          {...pa('title')}
        >
          {opti.title}
        </h3>

        {opti.text && (
          <div className="prose prose-sm text-gray-600 mb-4" {...pa('text')}>
            <RichText content={opti.text?.json} />
          </div>
        )}

        {opti.linkUrl && opti.linkText && (
          <a
            href={String(opti.linkUrl)}
            className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium"
            {...pa('linkUrl')}
          >
            {opti.linkText}
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
