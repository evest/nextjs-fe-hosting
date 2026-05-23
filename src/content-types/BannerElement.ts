import { contentType } from '@/lib/content-type';

export const BannerElementCT = contentType({
  key: 'BannerElement',
  displayName: 'Banner',
  description:
    'Slim banner row with background image, heading, body text and a CTA link.',
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
