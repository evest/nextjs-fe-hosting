import { ContentProps } from '@optimizely/cms-sdk';
import {
  ComponentContainerProps,
  OptimizelyComposition,
  getPreviewUtils,
} from '@optimizely/cms-sdk/react/server';
import { LandingPageExperienceCT } from '@/content-types/LandingPageExperience';
import Image from 'next/image';

type Props = {
  content: ContentProps<typeof LandingPageExperienceCT>;
};

function ComponentWrapper({ children, node }: ComponentContainerProps) {
  const { pa } = getPreviewUtils(node);
  return (
    <div className="mb-8" {...pa(node)}>
      {children}
    </div>
  );
}

export default function LandingPageExperience({ content }: Props) {
  const { pa, src } = getPreviewUtils(content);
  const hasBackground = !!(content.backgroundImage?.url?.default || content.backgroundImage?.item?.Url);

  return (
    <div className={`landing-page-experience -mt-16 relative${hasBackground ? ' has-background-image' : ''}`}>
      {/* Full-bleed background image covering entire page including behind header */}
      {hasBackground && (
        <div className="absolute inset-0 -z-10">
          <Image
            src={src(content.backgroundImage)}
            alt=""
            fill
            className="object-cover"
            priority
          />
        </div>
      )}

      {/* Content area with top padding to clear the header */}
      <div className="relative pt-16">
        <OptimizelyComposition
          nodes={content.composition?.nodes ?? []}
          ComponentWrapper={ComponentWrapper}
        />
      </div>
    </div>
  );
}
