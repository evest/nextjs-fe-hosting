import { displayTemplate } from '@optimizely/cms-sdk';

export const RowDisplayTemplate = displayTemplate({
  key: 'RowDisplayTemplate',
  isDefault: true,
  displayName: 'Row Settings',
  nodeType: 'row',
  settings: {
    rowSpacing: {
      editor: 'select',
      displayName: 'Bottom Spacing',
      sortOrder: 0,
      choices: {
        none: { displayName: 'None', sortOrder: 0 },
        small: { displayName: 'Small', sortOrder: 1 },
        medium: { displayName: 'Medium (default)', sortOrder: 2 },
        large: { displayName: 'Large', sortOrder: 3 },
      },
    },
    verticalAlignment: {
      editor: 'select',
      displayName: 'Vertical Alignment',
      sortOrder: 1,
      choices: {
        start: { displayName: 'Top (default)', sortOrder: 0 },
        center: { displayName: 'Center', sortOrder: 1 },
        end: { displayName: 'Bottom', sortOrder: 2 },
        stretch: { displayName: 'Stretch', sortOrder: 3 },
      },
    },
  },
});
