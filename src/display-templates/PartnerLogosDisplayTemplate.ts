import { displayTemplate } from '@optimizely/cms-sdk';

export const PartnerLogosDisplayTemplate = displayTemplate({
  key: 'PartnerLogosDisplayTemplate',
  isDefault: true,
  displayName: 'Partner Logos Settings',
  contentType: 'PartnerLogos',
  settings: {
    surface: {
      editor: 'select',
      displayName: 'Surface',
      sortOrder: 0,
      choices: {
        light: { displayName: 'Light (default)', sortOrder: 0 },
        muted: { displayName: 'Muted', sortOrder: 1 },
        dark: { displayName: 'Dark', sortOrder: 2 },
      },
    },
    treatment: {
      editor: 'select',
      displayName: 'Treatment',
      sortOrder: 1,
      choices: {
        grayscale: { displayName: 'Grayscale (color on hover)', sortOrder: 0 },
        full: { displayName: 'Full color', sortOrder: 1 },
      },
    },
  },
});
