import { displayTemplate } from '@optimizely/cms-sdk';

export const BlankSectionDisplayTemplate = displayTemplate({
  key: 'BlankSectionDisplayTemplate',
  isDefault: true,
  displayName: 'Section Spacing',
  contentType: 'BlankSection',
  settings: {
    sectionSpacing: {
      editor: 'select',
      displayName: 'Section Padding',
      sortOrder: 0,
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
      sortOrder: 1,
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
      sortOrder: 2,
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
      sortOrder: 3,
      choices: {
        none: { displayName: 'None', sortOrder: 0 },
        small: { displayName: 'Small', sortOrder: 1 },
        medium: { displayName: 'Medium (default)', sortOrder: 2 },
        large: { displayName: 'Large', sortOrder: 3 },
      },
    },
  },
});
