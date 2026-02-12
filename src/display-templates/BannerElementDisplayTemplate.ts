import { displayTemplate } from '@optimizely/cms-sdk';

export const BannerDisplayTemplate = displayTemplate({
  key: 'BannerDisplayTemplate',
  isDefault: true,
  displayName: 'Banner Formatting',
  contentType: 'BannerElement',
  settings: {
    headingTag: {
      editor: 'select',
      displayName: 'Heading Type',
      sortOrder: 0,
      choices: {
        h1: { displayName: 'H1', sortOrder: 1 },
        h2: { displayName: 'H2', sortOrder: 2 },
        h3: { displayName: 'H3', sortOrder: 3 },
        h4: { displayName: 'H4', sortOrder: 4 },
        h5: { displayName: 'H5', sortOrder: 5 },
        h6: { displayName: 'H6', sortOrder: 6 },
      },
    },
    horizontalAlignment: {
      editor: 'select',
      displayName: 'Horizontal Alignment',
      sortOrder: 1,
      choices: {
        left: { displayName: 'Left', sortOrder: 1 },
        center: { displayName: 'Center', sortOrder: 2 },
        right: { displayName: 'Right', sortOrder: 3 },
      },
    },
    verticalAlignment: {
      editor: 'select',
      displayName: 'Vertical Alignment',
      sortOrder: 2,
      choices: {
        top: { displayName: 'Top', sortOrder: 1 },
        center: { displayName: 'Center', sortOrder: 2 },
        bottom: { displayName: 'Bottom', sortOrder: 3 },
      },
    },
    overlayPercentage: {
      editor: 'select',
      displayName: 'Overlay Darkness',
      sortOrder: 3,
      choices: {
        overlay0: { displayName: '0% (No Overlay)', sortOrder: 1 },
        overlay10: { displayName: '10%', sortOrder: 2 },
        overlay20: { displayName: '20%', sortOrder: 3 },
        overlay30: { displayName: '30%', sortOrder: 4 },
        overlay40: { displayName: '40%', sortOrder: 5 },
        overlay50: { displayName: '50%', sortOrder: 6 },
        overlay60: { displayName: '60%', sortOrder: 7 },
        overlay70: { displayName: '70%', sortOrder: 8 },
        overlay80: { displayName: '80%', sortOrder: 9 },
        overlay90: { displayName: '90%', sortOrder: 10 },
      },
    },
    ctaStyle: {
      editor: 'select',
      displayName: 'CTA Style',
      sortOrder: 4,
      choices: {
        button: { displayName: 'Button', sortOrder: 1 },
        link: { displayName: 'Link', sortOrder: 2 },
      },
    },
    ctaColor: {
      editor: 'select',
      displayName: 'CTA Color',
      sortOrder: 5,
      choices: {
        light: { displayName: 'Light (for dark backgrounds)', sortOrder: 1 },
        dark: { displayName: 'Dark (for light backgrounds)', sortOrder: 2 },
      },
    },
  },
});
