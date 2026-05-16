import { contentType } from '@optimizely/cms-sdk';

export const CalloutBannerCT = contentType({
  key: 'CalloutBanner',
  displayName: 'Callout Banner',
  baseType: '_component',
  compositionBehaviors: ['sectionEnabled', 'elementEnabled'],
  properties: {
    eyebrow: {
      type: 'string',
      displayName: 'Eyebrow',
      description: 'Small text shown above the headline',
      isLocalized: true,
      sortOrder: 5,
    },
    headline: {
      type: 'string',
      displayName: 'Headline',
      isRequired: true,
      isLocalized: true,
      sortOrder: 10,
    },
    description: {
      type: 'string',
      displayName: 'Description',
      isLocalized: true,
      sortOrder: 20,
    },
    primaryCta: {
      type: 'link',
      displayName: 'Primary CTA',
      sortOrder: 30,
    },
    secondaryCta: {
      type: 'link',
      displayName: 'Secondary CTA',
      sortOrder: 40,
    },
  },
});
