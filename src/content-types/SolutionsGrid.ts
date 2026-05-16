import { contentType } from '@optimizely/cms-sdk';
import { SolutionTileCT } from './SolutionTile';

export const SolutionsGridCT = contentType({
  key: 'SolutionsGrid',
  displayName: 'Solutions Grid',
  baseType: '_component',
  compositionBehaviors: ['sectionEnabled'],
  properties: {
    heading: {
      type: 'string',
      displayName: 'Heading',
      isLocalized: true,
      sortOrder: 10,
    },
    subheading: {
      type: 'string',
      displayName: 'Subheading',
      isLocalized: true,
      sortOrder: 20,
    },
    tiles: {
      type: 'array',
      displayName: 'Tiles',
      items: { type: 'component', contentType: SolutionTileCT },
      sortOrder: 30,
    },
  },
});
