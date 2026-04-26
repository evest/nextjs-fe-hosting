import { buildConfig } from '@optimizely/cms-sdk';

export default buildConfig({
  components: [
    './src/content-types/SeoBlock.ts',
    './src/content-types/ArticlePage.ts',
    './src/content-types/PersonPage.ts',
    './src/content-types/PersonElement.ts',
    './src/content-types/CardBlock.ts',
    './src/content-types/TextElement.ts',
    './src/content-types/RichTextElement.ts',
    './src/content-types/ImageElement.ts',
    './src/content-types/BannerElement.ts',
    './src/content-types/CallToActionElement.ts',
    './src/content-types/LandingPageExperience.ts',
    './src/display-templates/CallToActionElementDisplayTemplate.ts',
    './src/display-templates/TextElementDisplayTemplate.ts',
    './src/display-templates/ImageElementDisplayTemplate.ts',
    './src/display-templates/LandingPageExperienceDisplayTemplate.ts',
    './src/display-templates/BlankSectionDisplayTemplate.ts',
    './src/display-templates/RowDisplayTemplate.ts',
    './src/display-templates/ColumnDisplayTemplate.ts',
  ],
  propertyGroups: [
    { key: 'media', displayName: 'Media', sortOrder: 200 },
    { key: 'seo', displayName: 'SEO', sortOrder: 300 },
    { key: 'socialMedia', displayName: 'Social Media', sortOrder: 400 },
  ],
});
