import { contentType } from '@/lib/content-type';

export const TestimonialBlockCT = contentType({
  key: 'TestimonialBlock',
  displayName: 'Testimonials',
  description:
    'Up to three customer quotes with author name, role, company and photo.',
  baseType: '_component',
  compositionBehaviors: ['sectionEnabled', 'elementEnabled'],
  properties: {
    heading: {
      type: 'string',
      displayName: 'Heading',
      isLocalized: true,
      sortOrder: 5,
    },
    subheading: {
      type: 'string',
      displayName: 'Subheading',
      isLocalized: true,
      sortOrder: 6,
    },

    quote1: { type: 'string', displayName: 'Quote 1', isLocalized: true, sortOrder: 10 },
    author1Name: { type: 'string', displayName: 'Quote 1 — Author', isLocalized: true, sortOrder: 11 },
    author1Role: { type: 'string', displayName: 'Quote 1 — Role', isLocalized: true, sortOrder: 12 },
    author1Company: { type: 'string', displayName: 'Quote 1 — Company', isLocalized: true, sortOrder: 13 },
    author1Image: {
      type: 'contentReference',
      displayName: 'Quote 1 — Author image',
      allowedTypes: ['_image'],
      group: 'media',
      sortOrder: 14,
    },

    quote2: { type: 'string', displayName: 'Quote 2', isLocalized: true, sortOrder: 20 },
    author2Name: { type: 'string', displayName: 'Quote 2 — Author', isLocalized: true, sortOrder: 21 },
    author2Role: { type: 'string', displayName: 'Quote 2 — Role', isLocalized: true, sortOrder: 22 },
    author2Company: { type: 'string', displayName: 'Quote 2 — Company', isLocalized: true, sortOrder: 23 },
    author2Image: {
      type: 'contentReference',
      displayName: 'Quote 2 — Author image',
      allowedTypes: ['_image'],
      group: 'media',
      sortOrder: 24,
    },

    quote3: { type: 'string', displayName: 'Quote 3', isLocalized: true, sortOrder: 30 },
    author3Name: { type: 'string', displayName: 'Quote 3 — Author', isLocalized: true, sortOrder: 31 },
    author3Role: { type: 'string', displayName: 'Quote 3 — Role', isLocalized: true, sortOrder: 32 },
    author3Company: { type: 'string', displayName: 'Quote 3 — Company', isLocalized: true, sortOrder: 33 },
    author3Image: {
      type: 'contentReference',
      displayName: 'Quote 3 — Author image',
      allowedTypes: ['_image'],
      group: 'media',
      sortOrder: 34,
    },
  },
});
