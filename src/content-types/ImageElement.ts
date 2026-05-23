import { contentType } from '@/lib/content-type';

export const ImageElementCT = contentType({
  key: 'ImageElement',
  displayName: 'Image',
  description:
    'Single image with required alt text and an optional caption.',
  baseType: '_component',
  compositionBehaviors: ['elementEnabled'],
  properties: {
    image: {
      type: 'contentReference',
      displayName: 'Image',
      isRequired: true,
      allowedTypes: ['_image'],
    },
    altText: {
      type: 'string',
      displayName: 'Alt Text',
      isRequired: true,
      isLocalized: true,
    },
    caption: {
      type: 'string',
      displayName: 'Caption',
      isLocalized: true,
    },
  },
});
