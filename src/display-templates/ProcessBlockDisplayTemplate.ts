import { displayTemplate } from '@optimizely/cms-sdk';

export const ProcessBlockDisplayTemplate = displayTemplate({
  key: 'ProcessBlockDisplayTemplate',
  isDefault: true,
  displayName: 'Process Block Settings',
  contentType: 'ProcessBlock',
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
    layout: {
      editor: 'select',
      displayName: 'Layout',
      sortOrder: 1,
      choices: {
        horizontal: { displayName: 'Horizontal (default)', sortOrder: 0 },
        vertical: { displayName: 'Vertical (stacked)', sortOrder: 1 },
      },
    },
  },
});
