import { contentType } from '@/lib/content-type';

export const ArticleListBlockCT = contentType({
  key: 'ArticleListBlock',
  displayName: 'Article List',
  description:
    'Auto-generated list of articles under a parent page, newest first. Supports skip and max-items for pairing layouts (e.g. featured row + the rest).',
  baseType: '_component',
  compositionBehaviors: ['sectionEnabled', 'elementEnabled'],
  properties: {
    parent: {
      type: 'contentReference',
      displayName: 'Parent page',
      description: 'Articles whose URL begins with this page will be listed, newest first.',
      isRequired: true,
      allowedTypes: ['_page', '_experience'],
      sortOrder: 5,
    },
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
    skip: {
      type: 'integer',
      displayName: 'Skip',
      description: 'Skip this many of the newest articles. Useful for pairing two blocks on a page (e.g. show first 3 in a grid, then list the rest).',
      sortOrder: 25,
    },
    maxItems: {
      type: 'integer',
      displayName: 'Max items',
      description: 'Maximum number of articles to show. Leave empty to show all.',
      sortOrder: 30,
    },
  },
});
