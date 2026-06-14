import { contentType } from '@/lib/content-type';

// Singleton settings page. One instance should exist per CMS instance; queried
// by content type (not path) so it stays out of the public URL tree. The
// registered React component calls notFound() — settings are not browsable.
//
// Localized fields (siteName, llmsDescription, organization.description,
// addressLocality) follow the editor's locale switcher. Non-localized fields
// (logo, sameAs, contact info, country code) share one canonical value across
// all locales.
export const SiteSettingsCT = contentType({
  key: 'SiteSettings',
  displayName: 'Site Settings',
  description:
    'Site-wide settings used to build Organization / WebSite JSON-LD and the llms.txt index. Create one instance — it is fetched by content type, not by URL, so its path is not public.',
  baseType: '_page',
  properties: {
    siteName: {
      type: 'string',
      displayName: 'Site name',
      description: 'Brand name shown in JSON-LD Organization/WebSite and as the title of llms.txt.',
      isLocalized: true,
      sortOrder: 10,
    },
    logo: {
      type: 'contentReference',
      displayName: 'Logo',
      description: 'Brand logo used as Organization.logo in JSON-LD. PNG or SVG, ideally at least 112×112 px.',
      allowedTypes: ['_image'],
      sortOrder: 20,
    },
    defaultOgImage: {
      type: 'contentReference',
      displayName: 'Default Open Graph image',
      description: 'Fallback social-share image when a page has no SEO Open Graph image set.',
      allowedTypes: ['_image'],
      sortOrder: 30,
    },
    llmsDescription: {
      type: 'string',
      displayName: 'LLM index description',
      description:
        'Short summary of what this site is and covers, written for LLM crawlers (Perplexity, ChatGPT, etc.). Used as the blockquote line in /llms.txt. Falls back to the organization description if blank.',
      isLocalized: true,
      sortOrder: 40,
    },
    legalName: {
      type: 'string',
      displayName: 'Legal name',
      description: 'Canonical legal entity name (e.g. "Optimizely Inc."). Not localized — schema.org expects one value.',
      group: 'organization',
      sortOrder: 100,
    },
    organizationDescription: {
      type: 'string',
      displayName: 'Organization description',
      description: 'One-paragraph description of the organization for JSON-LD Organization.description.',
      isLocalized: true,
      group: 'organization',
      sortOrder: 110,
    },
    sameAs: {
      type: 'array',
      displayName: 'Social / external profile URLs',
      description:
        'Canonical URLs for the brand on other sites (LinkedIn, X, Wikipedia, Crunchbase, etc.). Emitted as Organization.sameAs. Use one global set covering all locales.',
      items: { type: 'url' },
      group: 'organization',
      sortOrder: 120,
    },
    contactEmail: {
      type: 'string',
      displayName: 'Contact email',
      description: 'Public contact email for Organization.contactPoint.',
      group: 'organization',
      sortOrder: 130,
    },
    contactPhone: {
      type: 'string',
      displayName: 'Contact phone',
      description: 'Public contact phone in E.164 format (e.g. +47 22 12 34 56).',
      group: 'organization',
      sortOrder: 140,
    },
    addressLocality: {
      type: 'string',
      displayName: 'Address — city',
      description: 'City name. Localized so it can be translated (Köln / Cologne).',
      isLocalized: true,
      group: 'organization',
      sortOrder: 150,
    },
    addressCountry: {
      type: 'string',
      displayName: 'Address — country code',
      description: 'ISO 3166-1 alpha-2 country code (e.g. "NO", "US"). Not localized.',
      group: 'organization',
      sortOrder: 160,
    },
    webExperimentationSnippetId: {
      type: 'string',
      displayName: 'Web Experimentation snippet ID',
      description:
        'Optimizely Web Experimentation project/snippet ID (the part before .js in https://cdn.optimizely.com/js/<ID>.js). Set it to load the experimentation snippet site-wide; leave blank to turn it off. Not localized — one Optimizely project serves all languages. Saving clears the whole site cache so the change goes live everywhere.',
      sortOrder: 200,
    },
  },
});
