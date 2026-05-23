import { contentType } from '@/lib/content-type';

export const CalloutBannerCT = contentType({
  key: 'CalloutBanner',
  displayName: 'Callout Banner',
  description:
    'Attention-grabbing CTA banner with eyebrow, headline, body text and dual CTAs.',
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
