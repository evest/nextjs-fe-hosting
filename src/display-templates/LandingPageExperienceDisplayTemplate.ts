import { displayTemplate } from '@optimizely/cms-sdk';

export const LandingPageExperienceDisplayTemplate = displayTemplate({
  key: 'LandingPageExperienceDisplayTemplate',
  isDefault: true,
  displayName: 'Landing Page Display',
  contentType: 'LandingPageExperience',
  settings: {
    fullBleedImage: {
      editor: 'select',
      displayName: 'Extend image behind header',
      sortOrder: 0,
      choices: {
        off: { displayName: 'No', sortOrder: 0 },
        on: { displayName: 'Yes', sortOrder: 1 },
      },
    },
    headerStyle: {
      editor: 'select',
      displayName: 'Header Style',
      sortOrder: 1,
      choices: {
        dark: { displayName: 'Dark (default)', sortOrder: 0 },
        light: { displayName: 'Light (for dark backgrounds)', sortOrder: 1 },
      },
    },
  },
});
