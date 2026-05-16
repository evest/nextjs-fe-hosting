import { displayTemplate } from '@optimizely/cms-sdk';

export const CalloutBannerDisplayTemplate = displayTemplate({
  key: 'CalloutBannerDisplayTemplate',
  isDefault: true,
  displayName: 'Callout Banner Settings',
  contentType: 'CalloutBanner',
  settings: {
    surface: {
      editor: 'select',
      displayName: 'Surface',
      sortOrder: 0,
      choices: {
        dark: { displayName: 'Dark (default)', sortOrder: 0 },
        light: { displayName: 'Light', sortOrder: 1 },
        muted: { displayName: 'Muted', sortOrder: 2 },
      },
    },
    alignment: {
      editor: 'select',
      displayName: 'Alignment',
      sortOrder: 1,
      choices: {
        center: { displayName: 'Center (default)', sortOrder: 0 },
        left: { displayName: 'Left', sortOrder: 1 },
      },
    },
  },
});
