import { displayTemplate } from '@optimizely/cms-sdk';

export const ContactFormBlockDisplayTemplate = displayTemplate({
  key: 'ContactFormBlockDisplayTemplate',
  isDefault: true,
  displayName: 'Contact Form Settings',
  contentType: 'ContactFormBlock',
  settings: {
    surface: {
      editor: 'select',
      displayName: 'Surface',
      sortOrder: 0,
      choices: {
        muted: { displayName: 'Muted (default)', sortOrder: 0 },
        light: { displayName: 'Light', sortOrder: 1 },
        dark: { displayName: 'Dark', sortOrder: 2 },
      },
    },
    alignment: {
      editor: 'select',
      displayName: 'Heading alignment',
      sortOrder: 1,
      choices: {
        left: { displayName: 'Left (default)', sortOrder: 0 },
        center: { displayName: 'Center', sortOrder: 1 },
      },
    },
  },
});
