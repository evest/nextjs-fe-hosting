import { contentType } from '@optimizely/cms-sdk';

export const SolutionTileCT = contentType({
  key: 'SolutionTile',
  displayName: 'Solution Tile',
  baseType: '_component',
  compositionBehaviors: ['elementEnabled'],
  properties: {
    name: {
      type: 'string',
      displayName: 'Name',
      isRequired: true,
      isLocalized: true,
      sortOrder: 10,
    },
    tagline: {
      type: 'string',
      displayName: 'Tagline',
      description: 'Short descriptive sentence shown beneath the name',
      isLocalized: true,
      sortOrder: 20,
    },
    iconName: {
      type: 'string',
      displayName: 'Icon name',
      description: 'Lucide icon key (e.g. compass, layers, settings, sparkles, target)',
      sortOrder: 30,
    },
    link: {
      type: 'link',
      displayName: 'Link',
      sortOrder: 40,
    },
  },
});
