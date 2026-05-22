import { contentType } from '@optimizely/cms-sdk';
import { PersonPageCT } from './PersonPage';
import { SeoBlockCT } from './SeoBlock';

export const ArticlePageCT = contentType({
  key: 'ArticlePage',
  displayName: 'Article Page',
  baseType: '_page',
  mayContainTypes: ['*'],
  properties: {
    eyebrow: {
      type: 'string',
      displayName: 'Eyebrow',
      description: 'Small uppercase label above the title.',
      isLocalized: true,
      sortOrder: 8,
    },
    heading: {
      type: 'string',
      displayName: 'Heading',
      isRequired: true,
      isLocalized: true,
      indexingType: 'searchable',
      sortOrder: 10,      
    },
    body: {
      type: 'richText',
      displayName: 'Body',
      isLocalized: true,
      sortOrder: 30
    },
    additionalContent: {
      type: 'array',
      displayName: 'Additional Content',
      description:
        'Blocks shown at the bottom of the article — e.g. a contact CTA or related-article links.',
      items: {
        type: 'content',
        allowedTypes: ['_component'],
      },
      sortOrder: 40,
    },
    featuredImage: {
      type: 'contentReference',
      displayName: 'Featured Image',
      allowedTypes: ['_image'],
      description: 'Image shown on the top of the page',
      sortOrder: 5
    },
    seo: {
      type: 'component',
      displayName: 'SEO Settings',
      contentType: SeoBlockCT,
      group: 'seo',
      sortOrder: 100
    },
    ingress: {
      type: 'string',
      displayName: 'Introduction',
      sortOrder: 20
    },
    author: {
      type: 'contentReference',
      displayName: 'Author',
      description: 'Person referenced as the article author.',
      allowedTypes: [PersonPageCT],
      sortOrder: 25,
    },
    hideDateAndReadTime: {
      type: 'boolean',
      displayName: 'Hide date and read time',
      sortOrder: 45,
    },
  },
});
