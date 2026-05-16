import { displayTemplate } from '@optimizely/cms-sdk';

export const StatsBlockDisplayTemplate = displayTemplate({
  key: 'StatsBlockDisplayTemplate',
  isDefault: true,
  displayName: 'Stats Block Settings',
  contentType: 'StatsBlock',
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
  },
});
