import { contentType } from '@optimizely/cms-sdk';
import { PersonPageCT } from './PersonPage';

export const PersonElementCT = contentType({
  key: 'PersonElement',
  displayName: 'Person Element',
  baseType: '_component',
  compositionBehaviors: ['elementEnabled'],
  properties: {
    person: {
      type: 'contentReference',
      displayName: 'Person',
      required: true,
      allowedTypes: [PersonPageCT],
      sortOrder: 10,
    },
  },
});
