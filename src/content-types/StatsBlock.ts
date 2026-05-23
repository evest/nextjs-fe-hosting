import { contentType } from '@/lib/content-type';

export const StatsBlockCT = contentType({
  key: 'StatsBlock',
  displayName: 'Stats',
  description:
    'Row of four headline statistics (value + label) for results, metrics or social proof.',
  baseType: '_component',
  compositionBehaviors: ['sectionEnabled'],
  properties: {
    heading: {
      type: 'string',
      displayName: 'Heading',
      isLocalized: true,
      sortOrder: 5,
    },
    stat1Value: { type: 'string', displayName: 'Stat 1 — Value', isLocalized: true, sortOrder: 10 },
    stat1Label: { type: 'string', displayName: 'Stat 1 — Label', isLocalized: true, sortOrder: 11 },
    stat2Value: { type: 'string', displayName: 'Stat 2 — Value', isLocalized: true, sortOrder: 20 },
    stat2Label: { type: 'string', displayName: 'Stat 2 — Label', isLocalized: true, sortOrder: 21 },
    stat3Value: { type: 'string', displayName: 'Stat 3 — Value', isLocalized: true, sortOrder: 30 },
    stat3Label: { type: 'string', displayName: 'Stat 3 — Label', isLocalized: true, sortOrder: 31 },
    stat4Value: { type: 'string', displayName: 'Stat 4 — Value', isLocalized: true, sortOrder: 40 },
    stat4Label: { type: 'string', displayName: 'Stat 4 — Label', isLocalized: true, sortOrder: 41 },
  },
});
