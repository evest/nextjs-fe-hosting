import { Infer } from '@optimizely/cms-sdk';
import {
  ComponentContainerProps,
  OptimizelyExperience,
  getPreviewUtils,
} from '@optimizely/cms-sdk/react/server';
import { LandingPageExperienceCT } from '@/content-types/LandingPageExperience';
import Image from 'next/image';

type Props = {
  opti: Infer<typeof LandingPageExperienceCT>;
};

function ComponentWrapper({ children, node }: ComponentContainerProps) {
  const { pa } = getPreviewUtils(node);
  return (
    <div className="mb-8" {...pa(node)}>
      {children}
    </div>
  );
}

export default function LandingPageExperience({ opti }: Props) {
  const { pa, src } = getPreviewUtils(opti);
  const hasBackground = !!(opti.backgroundImage?.url?.default || opti.backgroundImage?.item?.Url);

  return (
    <div className={`landing-page-experience -mt-16 relative${hasBackground ? ' has-background-image' : ''}`}>
      {/* Full-bleed background image covering entire page including behind header */}
      {hasBackground && (
        <div className="absolute inset-0 -z-10">
          <Image
            src={src(opti.backgroundImage)}
            alt=""
            fill
            className="object-cover"
            priority
          />
        </div>
      )}

      {/* Content area with top padding to clear the header */}
      <div className="relative pt-16">
        <OptimizelyExperience
          nodes={opti.composition?.nodes ?? []}
          ComponentWrapper={ComponentWrapper}
        />
      </div>
    </div>
  );
}
