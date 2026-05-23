import { contentType } from '@/lib/content-type';

export const RichTextElementCT = contentType({
  key: 'RichTextElement',
  displayName: 'Rich Text',
  description:
    'Formatted long-form text with headings, lists, emphasis and inline links.',
  baseType: '_component',
  compositionBehaviors: ['elementEnabled'],
  properties: {
    content: {
      type: 'richText',
      displayName: 'Content',
      isRequired: true,
      isLocalized: true,
    },
  },
});
