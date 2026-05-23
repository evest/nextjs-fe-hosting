import { contentType } from '@/lib/content-type';

export const PageCardElementCT = contentType({
  key: 'PageCardElement',
  displayName: 'Page Card',
  description:
    "Card linking to another page or experience. Title, teaser and image are pulled from the target page's metadata.",
  baseType: '_component',
  compositionBehaviors: ['elementEnabled'],
  properties: {
    content: {
      type: 'contentReference',
      displayName: 'Page',
      description: 'Page or experience to render as a card',
      isRequired: true,
      allowedTypes: ['_page', '_experience'],
    },
  },
});
