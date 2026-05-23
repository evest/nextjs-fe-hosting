import { contentType } from '@/lib/content-type';

import { ICON_ENUM } from '@/lib/icons';

export const SolutionTileCT = contentType({
  key: 'SolutionTile',
  displayName: 'Solution Tile',
  description:
    'Single solution or service tile with icon, name, tagline and link. Used as a child of Solutions Grid.',
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
      displayName: 'Icon',
      description: 'Pick a Lucide icon from the curated list.',
      format: 'selectOne',
      enum: ICON_ENUM,
      sortOrder: 30,
    },
    link: {
      type: 'link',
      displayName: 'Link',
      sortOrder: 40,
    },
  },
});
