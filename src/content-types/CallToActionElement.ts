import { contentType } from '@optimizely/cms-sdk';

export const CallToActionElementCT = contentType({
  key: 'CallToActionElement',
  displayName: 'Call to Action Element',
  baseType: '_component',
  compositionBehaviors: ['elementEnabled'],
  properties: {
    link: {
      type: 'link',
      displayName: 'Link',
      required: true,
      localized: true,
    },
  },
});
