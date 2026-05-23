import { displayTemplate } from '@optimizely/cms-sdk';

export const ArticleListBlockDisplayTemplate = displayTemplate({
  key: 'ArticleListBlockDisplayTemplate',
  isDefault: true,
  displayName: 'Article List Settings',
  contentType: 'ArticleListBlock',
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
        list: { displayName: 'List with thumbnail (default)', sortOrder: 0 },
        grid: { displayName: 'Card grid', sortOrder: 1 },
      },
    },
    verticalPadding: {
      editor: 'select',
      displayName: 'Vertical padding',
      sortOrder: 2,
      choices: {
        none: { displayName: 'None', sortOrder: 0 },
        small: { displayName: 'Small', sortOrder: 1 },
        medium: { displayName: 'Medium (default)', sortOrder: 2 },
        large: { displayName: 'Large', sortOrder: 3 },
      },
    },
    horizontalPadding: {
      editor: 'select',
      displayName: 'Horizontal padding',
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
