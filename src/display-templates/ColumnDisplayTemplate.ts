import { displayTemplate } from '@optimizely/cms-sdk';

export const ColumnDisplayTemplate = displayTemplate({
  key: 'ColumnDisplayTemplate',
  isDefault: true,
  displayName: 'Column Settings',
  nodeType: 'column',
  settings: {
    columnSpacing: {
      editor: 'select',
      displayName: 'Inner Padding',
      sortOrder: 0,
      choices: {
        none: { displayName: 'None (default)', sortOrder: 0 },
        small: { displayName: 'Small', sortOrder: 1 },
        medium: { displayName: 'Medium', sortOrder: 2 },
        large: { displayName: 'Large', sortOrder: 3 },
      },
    },
    hideOnMobile: {
      editor: 'select',
      displayName: 'Hide on Mobile',
      sortOrder: 1,
      choices: {
        show: { displayName: 'Show (default)', sortOrder: 0 },
        hide: { displayName: 'Hide on mobile', sortOrder: 1 },
      },
    },
    hideOnTablet: {
      editor: 'select',
      displayName: 'Hide on Tablet',
      sortOrder: 2,
      choices: {
        show: { displayName: 'Show (default)', sortOrder: 0 },
        hide: { displayName: 'Hide on tablet', sortOrder: 1 },
      },
    },
  },
});
