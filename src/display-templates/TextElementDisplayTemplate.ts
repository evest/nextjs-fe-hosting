import { displayTemplate } from '@optimizely/cms-sdk';

export const TextElementDisplayTemplate = displayTemplate({
  key: 'TextElementDisplayTemplate',
  isDefault: true,
  displayName: 'Text Element Display',
  contentType: 'TextElement',
  settings: {
    headingLevel: {
      editor: 'select',
      displayName: 'Heading Level',
      sortOrder: 0,
      choices: {
        plain: { displayName: 'Plain Text', sortOrder: 0 },
        h1: { displayName: 'Heading 1', sortOrder: 1 },
        h2: { displayName: 'Heading 2', sortOrder: 2 },
        h3: { displayName: 'Heading 3', sortOrder: 3 },
        h4: { displayName: 'Heading 4', sortOrder: 4 },
        h5: { displayName: 'Heading 5', sortOrder: 5 },
      },
    },
    alignment: {
      editor: 'select',
      displayName: 'Alignment',
      sortOrder: 1,
      choices: {
        left: { displayName: 'Left', sortOrder: 0 },
        center: { displayName: 'Center', sortOrder: 1 },
        right: { displayName: 'Right', sortOrder: 2 },
      },
    },
  },
});
