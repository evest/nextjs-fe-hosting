import { displayTemplate } from '@optimizely/cms-sdk';

export const ImageDisplayTemplate = displayTemplate({
  key: 'ImageDisplayTemplate',
  isDefault: true,
  displayName: 'Image Formatting',
  contentType: 'ImageElement',
  settings: {
    alignment: {
      editor: 'select',
      displayName: 'Alignment',
      sortOrder: 0,
      choices: {
        left: { displayName: 'Left', sortOrder: 1 },
        center: { displayName: 'Center', sortOrder: 2 },
        right: { displayName: 'Right', sortOrder: 3 },
        full: { displayName: 'Full Width', sortOrder: 4 },
      },
    },
    size: {
      editor: 'select',
      displayName: 'Size',
      sortOrder: 1,
      choices: {
        small: { displayName: 'Small (300px)', sortOrder: 1 },
        medium: { displayName: 'Medium (500px)', sortOrder: 2 },
        large: { displayName: 'Large (800px)', sortOrder: 3 },
        full: { displayName: 'Full Width', sortOrder: 4 },
      },
    },
    aspectRatio: {
      editor: 'select',
      displayName: 'Aspect Ratio',
      sortOrder: 2,
      choices: {
        auto: { displayName: 'Original', sortOrder: 1 },
        square: { displayName: 'Square (1:1)', sortOrder: 2 },
        video: { displayName: 'Video (16:9)', sortOrder: 3 },
        standard: { displayName: 'Standard (4:3)', sortOrder: 4 },
        classic: { displayName: 'Classic (3:2)', sortOrder: 5 },
        ultrawide: { displayName: 'Ultrawide (21:9)', sortOrder: 6 },
      },
    },
    borderRadius: {
      editor: 'select',
      displayName: 'Border Radius',
      sortOrder: 3,
      choices: {
        none: { displayName: 'None', sortOrder: 1 },
        small: { displayName: 'Small', sortOrder: 2 },
        medium: { displayName: 'Medium', sortOrder: 3 },
        large: { displayName: 'Large', sortOrder: 4 },
        full: { displayName: 'Full (Circle/Pill)', sortOrder: 5 },
      },
    },
    shadow: {
      editor: 'select',
      displayName: 'Shadow',
      sortOrder: 4,
      choices: {
        none: { displayName: 'None', sortOrder: 1 },
        small: { displayName: 'Small', sortOrder: 2 },
        medium: { displayName: 'Medium', sortOrder: 3 },
        large: { displayName: 'Large', sortOrder: 4 },
      },
    },
    verticalAlignment: {
      editor: 'select',
      displayName: 'Vertical Alignment',
      sortOrder: 5,
      choices: {
        top: { displayName: 'Top', sortOrder: 1 },
        center: { displayName: 'Center', sortOrder: 2 },
        bottom: { displayName: 'Bottom', sortOrder: 3 },
      },
    },
    spacing: {
      editor: 'select',
      displayName: 'Spacing',
      sortOrder: 6,
      choices: {
        none: { displayName: 'None', sortOrder: 1 },
        small: { displayName: 'Small', sortOrder: 2 },
        medium: { displayName: 'Medium', sortOrder: 3 },
        large: { displayName: 'Large', sortOrder: 4 },
        xlarge: { displayName: 'Extra Large', sortOrder: 5 },
      },
    },
  },
});
