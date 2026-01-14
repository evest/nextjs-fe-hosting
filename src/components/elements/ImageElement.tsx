import { Infer } from '@optimizely/cms-sdk';
import { getPreviewUtils } from '@optimizely/cms-sdk/react/server';
import { ImageElementCT } from '@/content-types/ImageElement';
import Image from 'next/image';

type Props = {
  opti: Infer<typeof ImageElementCT>;
};

export default function ImageElement({ opti }: Props) {
  const { pa, src } = getPreviewUtils(opti);

  if (!opti.image?.url?.default) {
    return null;
  }

  return (
    <figure className="my-4">
      <div className="relative w-full h-64 md:h-80 rounded-lg overflow-hidden">
        <Image
          src={src(opti.image)}
          alt={opti.altText || ''}
          fill
          className="object-cover"
          {...pa('image')}
        />
      </div>
      {opti.caption && (
        <figcaption
          className="mt-2 text-sm text-gray-500 text-center italic"
          {...pa('caption')}
        >
          {opti.caption}
        </figcaption>
      )}
    </figure>
  );
}
