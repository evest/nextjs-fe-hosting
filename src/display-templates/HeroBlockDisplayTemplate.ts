import { displayTemplate } from '@optimizely/cms-sdk';

export const HeroBlockDisplayTemplate = displayTemplate({
  key: 'HeroBlockDisplayTemplate',
  isDefault: true,
  displayName: 'Hero Settings',
  contentType: 'HeroBlock',
  settings: {
    surface: {
      editor: 'select',
      displayName: 'Surface',
      sortOrder: 0,
      choices: {
        dark: { displayName: 'Dark (default)', sortOrder: 0 },
        light: { displayName: 'Light', sortOrder: 1 },
        muted: { displayName: 'Muted', sortOrder: 2 },
        image: { displayName: 'Background image', sortOrder: 3 },
      },
    },
    height: {
      editor: 'select',
      displayName: 'Height',
      sortOrder: 1,
      choices: {
        compact: { displayName: 'Compact', sortOrder: 0 },
        standard: { displayName: 'Standard (default)', sortOrder: 1 },
        tall: { displayName: 'Tall', sortOrder: 2 },
      },
    },
    alignment: {
      editor: 'select',
      displayName: 'Text alignment',
      sortOrder: 2,
      choices: {
        left: { displayName: 'Left (default)', sortOrder: 0 },
        center: { displayName: 'Center', sortOrder: 1 },
      },
    },
    imageDim: {
      editor: 'select',
      displayName: 'Image dim (image surface only)',
      sortOrder: 3,
      choices: {
        none: { displayName: 'None', sortOrder: 0 },
        subtle: { displayName: 'Subtle', sortOrder: 1 },
        medium: { displayName: 'Medium (default)', sortOrder: 2 },
        strong: { displayName: 'Strong', sortOrder: 3 },
      },
    },
  },
});
