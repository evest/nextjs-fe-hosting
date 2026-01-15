import { contentType } from '@optimizely/cms-sdk';

export const RichTextElementCT = contentType({
  key: 'RichTextElement',
  displayName: 'Rich Text Element',
  baseType: '_component',
  compositionBehaviors: ['elementEnabled'],
  properties: {
    content: {
      type: 'richText',
      displayName: 'Content',
      required: true,
      localized: true,
    },
  },
});
