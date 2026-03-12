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
      description: 'Image shown on the top of the page',
    },
    seo: {
      type: 'component',
      displayName: 'SEO Settings',
      contentType: SeoBlockCT,
      group: 'seo',
    },
    ingress: {
      type: 'string',
      displayName: 'Introduction',
      sortOrder: 20
    }
  },
});
