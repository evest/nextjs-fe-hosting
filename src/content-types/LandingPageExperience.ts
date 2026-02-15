import { contentType } from '@optimizely/cms-sdk';

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
  },
});
