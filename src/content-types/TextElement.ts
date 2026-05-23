import { contentType } from '@/lib/content-type';

export const TextElementCT = contentType({
  key: 'TextElement',
  displayName: 'Text',
  description:
    'Plain-text snippet — short headlines, labels or paragraphs placed inline.',
  baseType: '_component',
  compositionBehaviors: ['elementEnabled'],
  properties: {
    text: {
      type: 'string',
      displayName: 'Text',
      isRequired: true,
      isLocalized: true,
    },
  },
});
