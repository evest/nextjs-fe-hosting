import { contentType } from '@optimizely/cms-sdk';

export const CardBlockCT = contentType({
  key: 'CardBlock',
  displayName: 'Card Block',
  baseType: '_component',
  compositionBehaviors: ['sectionEnabled', 'elementEnabled'],
  properties: {
    title: {
      type: 'string',
      displayName: 'Title',
      isRequired: true,
      isLocalized: true,
    },
    text: {
      type: 'richText',
      displayName: 'Text',
      isLocalized: true,
    },
    linkText: {
      type: 'string',
      displayName: 'Link Text',
      isLocalized: true,
    },
    linkUrl: {
      type: 'url',
      displayName: 'Link URL',
    },
    image: {
      type: 'contentReference',
      displayName: 'Image',
      allowedTypes: ['_image'],
    },
  },
});
