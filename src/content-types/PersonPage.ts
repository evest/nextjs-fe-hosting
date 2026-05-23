import { contentType } from '@/lib/content-type';
import { SeoBlockCT } from './SeoBlock';

export const PersonPageCT = contentType({
  key: 'PersonPage',
  displayName: 'Person Page',
  description:
    "Profile page for a team member or contributor. Referenced by articles as the author and embedded inline via the Person element.",
  baseType: '_page',
  mayContainTypes: ['*'],
  properties: {
    name: {
      type: 'string',
      displayName: 'Name',
      isRequired: true,
      isLocalized: true,
      sortOrder: 10,
    },
    title: {
      type: 'string',
      displayName: 'Title',
      description: 'Job title or role',
      isLocalized: true,
      sortOrder: 20,
    },
    bio: {
      type: 'richText',
      displayName: 'Bio',
      isLocalized: true,
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
