import { contentType } from '@optimizely/cms-sdk';

export const PageCardElementCT = contentType({
  key: 'PageCardElement',
  displayName: 'Page Card',
  baseType: '_component',
  compositionBehaviors: ['elementEnabled'],
  properties: {
    content: {
      type: 'contentReference',
      displayName: 'Page',
      description: 'Page or experience to render as a card',
      required: true,
      allowedTypes: ['_page', '_experience'],
    },
  },
});
