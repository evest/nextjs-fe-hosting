import { contentType } from '@optimizely/cms-sdk';

export const SeoBlockCT = contentType({
  key: 'SeoBlock',
  displayName: 'SEO Settings',
  baseType: '_component',
  properties: {
    metaTitle: {
      type: 'string',
      displayName: 'Meta Title',
      description: 'Override the default page title in search results',
      localized: true,
      maxLength: 60,
      indexingType: 'queryable',
    },
    metaDescription: {
      type: 'string',
      displayName: 'Meta Description',
      description: 'Summary shown in search engine results',
      localized: true,
      maxLength: 160,
      indexingType: 'queryable',
    },
    openGraphImage: {
      type: 'contentReference',
      displayName: 'Open Graph Image',
      description: 'Image shown when the page is shared on social media',
      allowedTypes: ['_image'],
    },
    noIndex: {
      type: 'boolean',
      displayName: 'No Index',
      description: 'Prevent search engines from indexing this page',
    },
    noFollow: {
      type: 'boolean',
      displayName: 'No Follow',
      description: 'Prevent search engines from following links on this page',
    },
  },
});
