import { ContentProps, damAssets } from '@optimizely/cms-sdk';
import {
  ComponentContainerProps,
  OptimizelyComposition,
  getPreviewUtils,
} from '@optimizely/cms-sdk/react/server';
import { LandingPageExperienceCT } from '@/content-types/LandingPageExperience';
import { LandingPageExperienceDisplayTemplate } from '@/display-templates/LandingPageExperienceDisplayTemplate';
import Image from 'next/image';

type Props = {
  content: ContentProps<typeof LandingPageExperienceCT>;
  displaySettings?: ContentProps<typeof LandingPageExperienceDisplayTemplate>;
};

function ComponentWrapper({ children, node }: ComponentContainerProps) {
  const { pa } = getPreviewUtils(node);
  return (
    <div className="mb-2" {...pa(node)}>
      {children}
    </div>
  );
}

export default function LandingPageExperience({ content, displaySettings }: Props) {
  const { pa, src } = getPreviewUtils(content);
  const { getAlt } = damAssets(content);
  const hasBackground = !!src(content.backgroundImage);
  const fullBleed = displaySettings?.fullBleedImage === 'on';
  const headerStyle = displaySettings?.headerStyle ?? 'dark';

  const classes = [
    'landing-page-experience',
    fullBleed ? '-mt-16' : '',
    'relative',
    hasBackground && fullBleed ? 'has-background-image' : '',
    headerStyle === 'light' ? 'header-light' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className={classes}>
      {/* Background image — full-bleed extends behind header */}
      {hasBackground && (
        <div className="absolute inset-0 -z-10">
          <Image
            src={src(content.backgroundImage)!}
            alt={getAlt(content.backgroundImage, '')}
            fill
            className="object-cover"
            sizes="100vw"
            priority
          />
        </div>
      )}

      {/* Content area — extra top padding when full-bleed to clear the header */}
      <div className={`relative ${fullBleed ? 'pt-16' : ''}`}>
        <OptimizelyComposition
          nodes={content.composition?.nodes ?? []}
          ComponentWrapper={ComponentWrapper}
        />
      </div>
    </div>
  );
}
