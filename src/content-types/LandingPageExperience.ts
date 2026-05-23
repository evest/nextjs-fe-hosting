import { contentType } from '@/lib/content-type';
import { SeoBlockCT } from './SeoBlock';

export const LandingPageExperienceCT = contentType({
  key: 'LandingPageExperience',
  displayName: 'Landing Page Experience',
  description:
    'Full Visual Builder experience for campaign or marketing landing pages. Composed from sections and elements in the Visual Builder editor.',
  baseType: '_experience',
  mayContainTypes: ['*'],
  properties: {
    backgroundImage: {
      type: 'contentReference',
      displayName: 'Background Image',
      allowedTypes: ['_image'],
      group: 'media',
    },
    seo: {
      type: 'component',
      displayName: 'SEO Settings',
      contentType: SeoBlockCT,
      group: 'seo',
    },
  },
});
