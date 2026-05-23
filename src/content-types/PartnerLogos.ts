import { contentType } from '@/lib/content-type';

export const PartnerLogosCT = contentType({
  key: 'PartnerLogos',
  displayName: 'Partner Logos',
  description:
    'Strip of partner or client logos for social proof.',
  baseType: '_component',
  compositionBehaviors: ['sectionEnabled'],
  properties: {
    heading: {
      type: 'string',
      displayName: 'Heading',
      isLocalized: true,
      sortOrder: 10,
    },
    logos: {
      type: 'array',
      displayName: 'Logos',
      description: 'Partner / client logos shown as a single strip.',
      items: { type: 'contentReference', allowedTypes: ['_image'] },
      sortOrder: 20,
    },
  },
});
