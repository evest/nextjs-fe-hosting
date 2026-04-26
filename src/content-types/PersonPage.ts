import { contentType } from '@optimizely/cms-sdk';
import { SeoBlockCT } from './SeoBlock';

export const PersonPageCT = contentType({
  key: 'PersonPage',
  displayName: 'Person Page',
  baseType: '_page',
  properties: {
    name: {
      type: 'string',
      displayName: 'Name',
      required: true,
      localized: true,
      sortOrder: 10,
    },
    title: {
      type: 'string',
      displayName: 'Title',
      description: 'Job title or role',
      localized: true,
      sortOrder: 20,
    },
    bio: {
      type: 'richText',
      displayName: 'Bio',
      localized: true,
      sortOrder: 30,
    },
    image: {
      type: 'contentReference',
      displayName: 'Image',
      allowedTypes: ['_image'],
      description: 'Profile photo',
      sortOrder: 5,
    },
    linkedIn: {
      type: 'url',
      displayName: 'LinkedIn',
      group: 'socialMedia',
      sortOrder: 40,
    },
    xtwitter: {
      type: 'url',
      displayName: 'X (Twitter)',
      group: 'socialMedia',
      sortOrder: 50,
    },
    facebook: {
      type: 'url',
      displayName: 'Facebook',
      group: 'socialMedia',
      sortOrder: 60,
    },
    instagram: {
      type: 'url',
      displayName: 'Instagram',
      group: 'socialMedia',
      sortOrder: 70,
    },
    youTube: {
      type: 'url',
      displayName: 'YouTube',
      group: 'socialMedia',
      sortOrder: 80,
    },
    tikTok: {
      type: 'url',
      displayName: 'TikTok',
      group: 'socialMedia',
      sortOrder: 90,
    },
    seo: {
      type: 'component',
      displayName: 'SEO Settings',
      contentType: SeoBlockCT,
      group: 'seo',
      sortOrder: 100,
    },
  },
});
