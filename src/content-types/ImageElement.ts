import { contentType } from '@optimizely/cms-sdk';

export const ImageElementCT = contentType({
  key: 'ImageElement',
  displayName: 'Image Element',
  baseType: '_component',
  compositionBehaviors: ['elementEnabled'],
  properties: {
    image: {
      type: 'contentReference',
      displayName: 'Image',
      required: true,
      allowedTypes: ['_image'],
    },
    altText: {
      type: 'string',
      displayName: 'Alt Text',
      required: true,
      localized: true,
    },
    caption: {
      type: 'string',
      displayName: 'Caption',
      localized: true,
    },
  },
});
