import { contentType } from '@optimizely/cms-sdk';

export const AccordionItemCT = contentType({
  key: 'AccordionItem',
  displayName: 'Accordion Item',
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
