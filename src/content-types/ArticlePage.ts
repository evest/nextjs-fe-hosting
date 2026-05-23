import { contentType } from '@/lib/content-type';
import { ARTICLE_CATEGORY_ENUM } from '@/lib/article-categories';
import { PersonPageCT } from './PersonPage';
import { SeoBlockCT } from './SeoBlock';

export const ArticlePageCT = contentType({
  key: 'ArticlePage',
  displayName: 'Article Page',
  description:
    'Long-form editorial or blog article. Has body, optional featured image, author reference, category and an Additional Content slot for blocks below the body.',
  baseType: '_page',
  mayContainTypes: ['*'],
  properties: {
    category: {
      type: 'string',
      displayName: 'Category',
      description:
        'Topic category — used to group and filter articles. Labels are translated at render time.',
      format: 'selectOne',
      enum: ARTICLE_CATEGORY_ENUM,
      sortOrder: 4,
    },
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
      sortOrder: 25
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
      sortOrder: 22,
    },
    hideDateAndReadTime: {
      type: 'boolean',
      displayName: 'Hide date and read time',
      sortOrder: 45,
    },
  },
});
