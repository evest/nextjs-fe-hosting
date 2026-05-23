import { contentType } from '@/lib/content-type';

export const CallToActionElementCT = contentType({
  key: 'CallToActionElement',
  displayName: 'Call to Action',
  description:
    'Single CTA button or link, placeable inline within other blocks.',
  baseType: '_component',
  compositionBehaviors: ['elementEnabled'],
  properties: {
    link: {
      type: 'link',
      displayName: 'Link',
      isRequired: true,
      isLocalized: true,
    },
  },
});
