import { contentType } from '@/lib/content-type';

export const AdvancedHeroCT = contentType({
  key: 'AdvancedHero',
  displayName: 'Advanced Hero',
  description:
    'Editorial hero with markdown-emphasised headline, body text, dual CTAs and a trusted-by row. Section only — placeable in Visual Builder sections, not as an inline element.',
  baseType: '_component',
  compositionBehaviors: ['sectionEnabled'],
  properties: {
    eyebrow: {
      type: 'string',
      displayName: 'Eyebrow',
      description: 'Small uppercase line shown above the headline.',
      isLocalized: true,
      sortOrder: 10,
    },
    headline: {
      type: 'string',
      displayName: 'Headline',
      description:
        'Large editorial headline. Wrap words in *asterisks* to render them in the italic accent colour — e.g. "Unlock your *content* potential".',
      isRequired: true,
      isLocalized: true,
      sortOrder: 20,
    },
    bodyText: {
      type: 'string',
      displayName: 'Body text',
      description: 'Short paragraph shown below the headline.',
      isLocalized: true,
      sortOrder: 30,
    },
    primaryCta: {
      type: 'link',
      displayName: 'Primary CTA',
      sortOrder: 40,
    },
    secondaryCta: {
      type: 'link',
      displayName: 'Secondary CTA',
      sortOrder: 50,
    },
    trustedByLabel: {
      type: 'string',
      displayName: 'Trusted-by label',
      description: 'Small label shown above the trusted-by names (e.g. "Trusted by").',
      isLocalized: true,
      sortOrder: 60,
    },
    trustedByNames: {
      type: 'array',
      displayName: 'Trusted-by names',
      description: 'Company or client names listed in the trusted-by row.',
      items: { type: 'string' },
      sortOrder: 70,
    },
  },
});
