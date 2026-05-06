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
      isRequired: true,
      allowedTypes: ['_image'],
    },
    heading: {
      type: 'string',
      displayName: 'Heading',
      isRequired: true,
      isLocalized: true,
    },
    text: {
      type: 'string',
      displayName: 'Text',
      isLocalized: true,
    },
    ctaLink: {
      type: 'link',
      displayName: 'Call to Action Link',
    },
  },
});

// Re-export display template from separate file
export { BannerDisplayTemplate } from '@/display-templates/BannerElementDisplayTemplate';
