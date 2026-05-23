import { contentType } from '@/lib/content-type';
import { PersonPageCT } from './PersonPage';

export const PersonElementCT = contentType({
  key: 'PersonElement',
  displayName: 'Person',
  description:
    "Inline reference to a Person Page. Renders the person's avatar, name and role pulled from the linked profile.",
  baseType: '_component',
  compositionBehaviors: ['elementEnabled'],
  properties: {
    person: {
      type: 'contentReference',
      displayName: 'Person',
      isRequired: true,
      allowedTypes: [PersonPageCT],
      sortOrder: 10,
    },
  },
});
