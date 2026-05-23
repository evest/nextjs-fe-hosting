import { contentType } from '@/lib/content-type';
import { SolutionTileCT } from './SolutionTile';

export const SolutionsGridCT = contentType({
  key: 'SolutionsGrid',
  displayName: 'Solutions Grid',
  description:
    'Grid of Solution Tile children showcasing services or offerings.',
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
