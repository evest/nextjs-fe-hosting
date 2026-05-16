import { displayTemplate } from '@optimizely/cms-sdk';

export const SolutionsGridDisplayTemplate = displayTemplate({
  key: 'SolutionsGridDisplayTemplate',
  isDefault: true,
  displayName: 'Solutions Grid Settings',
  contentType: 'SolutionsGrid',
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
    columns: {
      editor: 'select',
      displayName: 'Columns (desktop)',
      sortOrder: 1,
      choices: {
        three: { displayName: 'Three (default)', sortOrder: 0 },
        four: { displayName: 'Four', sortOrder: 1 },
      },
    },
  },
});
