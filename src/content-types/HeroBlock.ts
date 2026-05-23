import { contentType } from '@/lib/content-type';

export const HeroBlockCT = contentType({
  key: 'HeroBlock',
  displayName: 'Hero',
  description:
    'Standard hero section with eyebrow, headline, subline, dual CTAs and an optional background image.',
  baseType: '_component',
  compositionBehaviors: ['sectionEnabled', 'elementEnabled'],
  properties: {
    eyebrow: {
      type: 'string',
      displayName: 'Eyebrow',
      description: 'Small text shown above the headline (e.g. category or tagline)',
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
    subline: {
      type: 'string',
      displayName: 'Subline',
      description: 'Short descriptive text below the headline',
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
    backgroundImage: {
      type: 'contentReference',
      displayName: 'Background Image',
      description: 'Optional. Used when "Image" background mode is selected.',
      allowedTypes: ['_image'],
      group: 'media',
      sortOrder: 50,
    },
  },
});
