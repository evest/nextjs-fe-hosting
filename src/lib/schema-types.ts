// The set of schema.org @type values an editor can pick for a page's JSON-LD
// override. Values map 1:1 to schema-dts types and are emitted verbatim as
// `@type` on the page's primary schema object.
//
// Two consumers read this list:
//   - SeoBlock uses SCHEMA_TYPE_ENUM to render the dropdown in the CMS editor.
//   - lib/json-ld.ts uses the value to set the top-level `@type` when the
//     editor has chosen one; otherwise the per-content-type dispatcher picks
//     a sensible default (Article for ArticlePage, ProfilePage for PersonPage,
//     WebPage for everything else).

export type SchemaType = {
  value: string;
  displayName: string;
};

export const SCHEMA_TYPES: readonly SchemaType[] = [
  // Generic page wrappers
  { value: 'WebPage', displayName: 'Web Page' },
  { value: 'AboutPage', displayName: 'About Page' },
  { value: 'ContactPage', displayName: 'Contact Page' },
  { value: 'FAQPage', displayName: 'FAQ Page' },
  { value: 'CollectionPage', displayName: 'Collection Page' },
  { value: 'ProfilePage', displayName: 'Profile Page' },
  // Editorial
  { value: 'Article', displayName: 'Article' },
  { value: 'BlogPosting', displayName: 'Blog Posting' },
  { value: 'NewsArticle', displayName: 'News Article' },
  // Commerce / offering
  { value: 'Product', displayName: 'Product' },
  { value: 'Service', displayName: 'Service' },
  { value: 'JobPosting', displayName: 'Job Posting' },
  // Things and events
  { value: 'Event', displayName: 'Event' },
  { value: 'Recipe', displayName: 'Recipe' },
  { value: 'Course', displayName: 'Course' },
  { value: 'HowTo', displayName: 'How-To' },
  { value: 'Review', displayName: 'Review' },
  { value: 'LocalBusiness', displayName: 'Local Business' },
  { value: 'Organization', displayName: 'Organization' },
  { value: 'ItemList', displayName: 'Item List' },
];

export const SCHEMA_TYPE_ENUM = SCHEMA_TYPES.map((s) => ({
  value: s.value,
  displayName: s.displayName,
}));
