import { displayTemplate } from '@optimizely/cms-sdk';

export const TestimonialBlockDisplayTemplate = displayTemplate({
  key: 'TestimonialBlockDisplayTemplate',
  isDefault: true,
  displayName: 'Testimonial Block Settings',
  contentType: 'TestimonialBlock',
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
    layout: {
      editor: 'select',
      displayName: 'Layout',
      sortOrder: 1,
      choices: {
        grid: { displayName: 'Grid (default)', sortOrder: 0 },
        single: { displayName: 'Single quote (use Quote 1 only)', sortOrder: 1 },
      },
    },
  },
});
