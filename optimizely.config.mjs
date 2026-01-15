import { buildConfig } from '@optimizely/cms-sdk';

export default buildConfig({
  components: [
    './src/content-types/ArticlePage.ts',
    './src/content-types/CardBlock.ts',
    './src/content-types/TextElement.ts',
    './src/content-types/RichTextElement.ts',
    './src/content-types/ImageElement.ts',
    './src/display-templates/TextElementDisplayTemplate.ts',
  ],
  propertyGroups: [
    { key: 'content', displayName: 'Content', sortOrder: 1 },
    { key: 'media', displayName: 'Media', sortOrder: 2 },
    { key: 'settings', displayName: 'Settings', sortOrder: 3 },
  ],
});
