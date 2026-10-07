import { contentType } from '@/lib/content-type';
import { AccordionItemCT } from './AccordionItem';

export const AccordionBlockCT = contentType({
  key: 'AccordionBlock',
  displayName: 'Accordion',
  description:
    'Collapsible FAQ list rendered from Accordion Item children.',
  baseType: '_component',
  compositionBehaviors: ['sectionEnabled'],
  properties: {
    heading: {
      type: 'string',
      displayName: 'Heading',
      isLocalized: true,
      sortOrder: 10,
    },
    subheading: {
      type: 'string',
      displayName: 'Subheading',
      isLocalized: true,
      sortOrder: 20,
    },
    items: {
      type: 'array',
      displayName: 'Items',
      items: { type: 'component', contentType: AccordionItemCT },
      // Localized so each language can have its own FAQ entries. Without it
      // the list is shared across locales and translated items are dropped.
      isLocalized: true,
      sortOrder: 30,
    },
  },
});
