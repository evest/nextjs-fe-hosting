import { contentType } from '@optimizely/cms-sdk';

export const ArticlePageCT = contentType({
  key: 'ArticlePage',
  displayName: 'Article Page',
  baseType: '_page',
  properties: {
    heading: {
      type: 'string',
      displayName: 'Heading',
      required: true,
      localized: true,
      indexingType: 'searchable',
    },
    body: {
      type: 'richText',
      displayName: 'Body',
      localized: true,
    },
    featuredImage: {
      type: 'contentReference',
      displayName: 'Featured Image',
      allowedTypes: ['_image'],
    },
  },
});
