import { ContentProps, damAssets, DisplayTemplates } from '@optimizely/cms-sdk';
import {
  ComponentContainerProps,
  OptimizelyComposition,
  getPreviewUtils,
} from '@optimizely/cms-sdk/react/server';
import { LandingPageExperienceCT } from '@/content-types/LandingPageExperience';
import { LandingPageExperienceDisplayTemplate } from '@/display-templates/LandingPageExperienceDisplayTemplate';
import { BackgroundTreatment } from './BackgroundTreatment';
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

  // A top-level experience is rendered via <OptimizelyComponent content={...}>
  // without a displaySettings prop — the SDK only parses and forwards display
  // settings to nested composition nodes. So read the experience's own display
  // template settings off the root composition node here.
  const settings = (displaySettings ??
    DisplayTemplates.parseDisplaySettings(content.composition?.displaySettings)) as
    | ContentProps<typeof LandingPageExperienceDisplayTemplate>
    | undefined;

  const hasBackground = !!src(content.backgroundImage);
  const fullBleed = settings?.fullBleedImage === 'on';
  const headerStyle = settings?.headerStyle ?? 'dark';
  const backgroundTreatment = settings?.backgroundTreatment ?? 'none';
  const hasTreatment = backgroundTreatment !== 'none';

  // A full-bleed image or a background treatment both sit behind the fixed
  // header, so the experience extends up under it and the header goes
  // transparent to let the background show through.
  const extendBehindHeader = fullBleed || hasTreatment;
  const headerTransparent = (hasBackground && fullBleed) || hasTreatment;

  const classes = [
    'landing-page-experience',
    extendBehindHeader ? '-mt-16' : '',
    'relative',
    headerTransparent ? 'has-background-image' : '',
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

      {/* Decorative background treatment (V1b / V1d) — none by default */}
      <BackgroundTreatment treatment={backgroundTreatment} />

      {/* Content area — extra top padding when extended behind the header */}
      <div className={`relative ${extendBehindHeader ? 'pt-16' : ''}`}>
        <OptimizelyComposition
          nodes={content.composition?.nodes ?? []}
          ComponentWrapper={ComponentWrapper}
        />
      </div>
    </div>
  );
}
