import { contentType } from '@optimizely/cms-sdk';
import { SeoBlockCT } from './SeoBlock';

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
      sortOrder: 10,      
    },
    body: {
      type: 'richText',
      displayName: 'Body',
      localized: true,
      sortOrder: 30
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
    }
  },
});
