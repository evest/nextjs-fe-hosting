import { contentType } from '@optimizely/cms-sdk';

export const ProcessBlockCT = contentType({
  key: 'ProcessBlock',
  displayName: 'Process Block',
  baseType: '_component',
  compositionBehaviors: ['sectionEnabled', 'elementEnabled'],
  properties: {
    heading: {
      type: 'string',
      displayName: 'Heading',
      isLocalized: true,
      sortOrder: 5,
    },
    subheading: {
      type: 'string',
      displayName: 'Subheading',
      isLocalized: true,
      sortOrder: 6,
    },

    step1Title: { type: 'string', displayName: 'Step 1 — Title', isLocalized: true, sortOrder: 10 },
    step1Description: { type: 'string', displayName: 'Step 1 — Description', isLocalized: true, sortOrder: 11 },
    step1Icon: {
      type: 'string',
      displayName: 'Step 1 — Icon name',
      description: 'Lucide icon key (e.g. search, settings, rocket, check)',
      sortOrder: 12,
    },

    step2Title: { type: 'string', displayName: 'Step 2 — Title', isLocalized: true, sortOrder: 20 },
    step2Description: { type: 'string', displayName: 'Step 2 — Description', isLocalized: true, sortOrder: 21 },
    step2Icon: { type: 'string', displayName: 'Step 2 — Icon name', sortOrder: 22 },

    step3Title: { type: 'string', displayName: 'Step 3 — Title', isLocalized: true, sortOrder: 30 },
    step3Description: { type: 'string', displayName: 'Step 3 — Description', isLocalized: true, sortOrder: 31 },
    step3Icon: { type: 'string', displayName: 'Step 3 — Icon name', sortOrder: 32 },

    step4Title: { type: 'string', displayName: 'Step 4 — Title', isLocalized: true, sortOrder: 40 },
    step4Description: { type: 'string', displayName: 'Step 4 — Description', isLocalized: true, sortOrder: 41 },
    step4Icon: { type: 'string', displayName: 'Step 4 — Icon name', sortOrder: 42 },
  },
});
