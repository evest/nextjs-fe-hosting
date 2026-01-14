import { buildConfig } from '@optimizely/cms-sdk';

export default buildConfig({
  components: ['./src/components/**/*.tsx'],
  propertyGroups: [
    { key: 'content', displayName: 'Content', sortOrder: 1 },
    { key: 'media', displayName: 'Media', sortOrder: 2 },
    { key: 'settings', displayName: 'Settings', sortOrder: 3 },
  ],
});
