import { contentType } from '@/lib/content-type';

export const ContactFormBlockCT = contentType({
  key: 'ContactFormBlock',
  displayName: 'Contact Form',
  description:
    'Lead-capture form with name, company, email, phone and message fields. Can render inline on a page or as a popup opened by a button.',
  baseType: '_component',
  compositionBehaviors: ['sectionEnabled', 'elementEnabled'],
  properties: {
    heading: {
      type: 'string',
      displayName: 'Heading',
      isLocalized: true,
      sortOrder: 5,
    },
    description: {
      type: 'string',
      displayName: 'Description',
      description: 'Short text shown below the heading',
      isLocalized: true,
      sortOrder: 10,
    },
    asPopup: {
      type: 'boolean',
      displayName: 'Show as popup',
      description: 'When enabled, only a button is shown — clicking it opens the form in a modal.',
      sortOrder: 20,
    },
    popupButtonLabel: {
      type: 'string',
      displayName: 'Popup button label',
      description: 'Label for the button that opens the popup. Only used when "Show as popup" is enabled.',
      isLocalized: true,
      sortOrder: 30,
    },
  },
});
