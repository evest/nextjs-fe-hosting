import { contentType } from '@optimizely/cms-sdk';

export const BannerElementCT = contentType({
  key: 'BannerElement',
  displayName: 'Banner Element',
  baseType: '_component',
  compositionBehaviors: ['elementEnabled'],
  properties: {
    backgroundImage: {
      type: 'contentReference',
      displayName: 'Background Image',
      required: true,
      allowedTypes: ['_image'],
      group: 'content',
    },
    heading: {
      type: 'string',
      displayName: 'Heading',
      required: true,
      localized: true,
      group: 'content',
    },
    text: {
      type: 'string',
      displayName: 'Text',
      localized: true,
      group: 'content',
    },
    ctaLink: {
      type: 'link',
      displayName: 'Call to Action Link',
      group: 'content',
    },
  },
});

// Re-export display template from separate file
export { BannerDisplayTemplate } from '@/display-templates/BannerElementDisplayTemplate';
