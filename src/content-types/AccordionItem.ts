import { contentType } from '@/lib/content-type';

export const AccordionItemCT = contentType({
  key: 'AccordionItem',
  displayName: 'Accordion Item',
  description:
    'Single question-and-answer row used inside an Accordion.',
  baseType: '_component',
  compositionBehaviors: ['elementEnabled'],
  properties: {
    summary: {
      type: 'string',
      displayName: 'Summary (collapsed heading)',
      isRequired: true,
      isLocalized: true,
      sortOrder: 10,
    },
    body: {
      type: 'richText',
      displayName: 'Body',
      isLocalized: true,
      sortOrder: 20,
    },
  },
});
