import { contentType } from '@optimizely/cms-sdk';
import { SeoBlockCT } from './SeoBlock';

export const LandingPageExperienceCT = contentType({
  key: 'LandingPageExperience',
  displayName: 'Landing Page Experience',
  baseType: '_experience',
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
