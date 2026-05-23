import { contentType } from '@/lib/content-type';
import { SCHEMA_TYPE_ENUM } from '@/lib/schema-types';

export const SeoBlockCT = contentType({
  key: 'SeoBlock',
  displayName: 'SEO Settings',
  description:
    'Per-page SEO and social-share metadata, plus structured-data (JSON-LD) overrides. Attached as a nested settings block on pages and experiences — never placed on a page on its own.',
  baseType: '_component',
  properties: {
    metaTitle: {
      type: 'string',
      displayName: 'Meta Title',
      description: 'Override the default page title in search results. Also used as the JSON-LD headline/name when set.',
      isLocalized: true,
      maxLength: 60,
      indexingType: 'queryable',
    },
    metaDescription: {
      type: 'string',
      displayName: 'Meta Description',
      description: 'Summary shown in search engine results. Also used as the JSON-LD description when set.',
      isLocalized: true,
      maxLength: 160,
      indexingType: 'queryable',
    },
    openGraphImage: {
      type: 'contentReference',
      displayName: 'Open Graph Image',
      description: 'Image shown when the page is shared on social media. Also used as the JSON-LD image when set.',
      allowedTypes: ['_image'],
    },
    noIndex: {
      type: 'boolean',
      displayName: 'No Index',
      description:
        'Hide this page from search engines AND from the LLM crawler indexes (/llms.txt and /llms-full.txt). Use for thin pages, gated content, or anything not meant to be discovered.',
    },
    noFollow: {
      type: 'boolean',
      displayName: 'No Follow',
      description: 'Prevent search engines from following links on this page',
    },
    // ── Structured data (JSON-LD) ───────────────────────────────────────
    schemaType: {
      type: 'string',
      displayName: 'Schema type',
      description:
        'Override the JSON-LD @type for this page. Leave blank to let the system pick a default based on the content type (Article for articles, ProfilePage for people, WebPage for everything else).',
      format: 'selectOne',
      enum: SCHEMA_TYPE_ENUM,
      group: 'schema',
      sortOrder: 10,
    },
    keywords: {
      type: 'string',
      displayName: 'Keywords',
      description:
        'Comma-separated topical keywords. Helps search engines and LLM crawlers (Perplexity, ChatGPT, etc.) understand what the page is about. Emitted on both <meta name="keywords"> and JSON-LD keywords.',
      isLocalized: true,
      group: 'schema',
      sortOrder: 20,
    },
    aboutTopics: {
      type: 'string',
      displayName: 'About — topics',
      description:
        'One topic per line. Emitted as JSON-LD `about` entries — helps LLMs disambiguate the page\'s subjects (e.g. "Headless CMS", "Server Components").',
      isLocalized: true,
      group: 'schema',
      sortOrder: 30,
    },
    speakableSelectors: {
      type: 'string',
      displayName: 'Speakable CSS selectors',
      description:
        'One CSS selector per line. Adds a SpeakableSpecification node to the page\'s schema marking which content is suitable for voice / assistant readouts (e.g. "h1", ".article-ingress").',
      group: 'schema',
      sortOrder: 40,
    },
    datePublishedOverride: {
      type: 'dateTime',
      displayName: 'Published date override',
      description:
        'Override the page\'s published date in JSON-LD. Use for backdated imports where the CMS publish timestamp doesn\'t reflect the article\'s real publication date.',
      group: 'schema',
      sortOrder: 50,
    },
    dateModifiedOverride: {
      type: 'dateTime',
      displayName: 'Modified date override',
      description:
        'Override the page\'s modified date in JSON-LD. Use sparingly — search engines and LLMs prefer accurate freshness signals.',
      group: 'schema',
      sortOrder: 60,
    },
    customJsonLd: {
      type: 'string',
      displayName: 'Custom JSON-LD (full replace)',
      description:
        'Advanced: paste a valid JSON-LD object or array here to fully replace the generated structured data for this page. Invalid JSON is logged and ignored at render. Locale-specific — set independently per language.',
      isLocalized: true,
      group: 'schema',
      sortOrder: 70,
    },
  },
});
