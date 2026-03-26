import { displayTemplate } from '@optimizely/cms-sdk';

export const BlankSectionDisplayTemplate = displayTemplate({
  key: 'BlankSectionDisplayTemplate',
  isDefault: true,
  displayName: 'Section Settings',
  contentType: 'BlankSection',
  settings: {
    colorScheme: {
      editor: 'select',
      displayName: 'Color Scheme',
      sortOrder: 0,
      choices: {
        light: { displayName: 'Light (default)', sortOrder: 0 },
        dark: { displayName: 'Dark', sortOrder: 1 },
        muted: { displayName: 'Muted', sortOrder: 2 },
      },
    },
    sectionSpacing: {
      editor: 'select',
      displayName: 'Section Padding',
      sortOrder: 1,
      choices: {
        none: { displayName: 'None', sortOrder: 0 },
        small: { displayName: 'Small', sortOrder: 1 },
        medium: { displayName: 'Medium (default)', sortOrder: 2 },
        large: { displayName: 'Large', sortOrder: 3 },
      },
    },
    rowGap: {
      editor: 'select',
      displayName: 'Row Gap',
      sortOrder: 2,
      choices: {
        none: { displayName: 'None', sortOrder: 0 },
        small: { displayName: 'Small', sortOrder: 1 },
        medium: { displayName: 'Medium (default)', sortOrder: 2 },
        large: { displayName: 'Large', sortOrder: 3 },
      },
    },
    columnGap: {
      editor: 'select',
      displayName: 'Column Gap',
      sortOrder: 3,
      choices: {
        none: { displayName: 'None', sortOrder: 0 },
        small: { displayName: 'Small', sortOrder: 1 },
        medium: { displayName: 'Medium (default)', sortOrder: 2 },
        large: { displayName: 'Large', sortOrder: 3 },
      },
    },
    elementGap: {
      editor: 'select',
      displayName: 'Element Gap (within columns)',
      sortOrder: 4,
      choices: {
        none: { displayName: 'None', sortOrder: 0 },
        small: { displayName: 'Small', sortOrder: 1 },
        medium: { displayName: 'Medium (default)', sortOrder: 2 },
        large: { displayName: 'Large', sortOrder: 3 },
      },
    },
  },
});
