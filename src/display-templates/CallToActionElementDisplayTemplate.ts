import { displayTemplate } from '@optimizely/cms-sdk';

export const CallToActionDisplayTemplate = displayTemplate({
  key: 'CallToActionDisplayTemplate',
  isDefault: true,
  displayName: 'Call to Action Formatting',
  contentType: 'CallToActionElement',
  settings: {
    style: {
      editor: 'select',
      displayName: 'Style',
      sortOrder: 0,
      choices: {
        link: { displayName: 'Link', sortOrder: 1 },
        button: { displayName: 'Button', sortOrder: 2 },
      },
    },
    color: {
      editor: 'select',
      displayName: 'Color',
      sortOrder: 1,
      choices: {
        light: { displayName: 'Light (for dark backgrounds)', sortOrder: 1 },
        dark: { displayName: 'Dark (for light backgrounds)', sortOrder: 2 },
      },
    },
  },
});
