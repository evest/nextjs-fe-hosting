import type {
  Article,
  BreadcrumbList,
  FAQPage,
  ImageObject,
  ListItem,
  Organization,
  Person,
  ProfilePage,
  Question,
  SpeakableSpecification,
  Thing,
  WebPage,
  WebSite,
  WithContext,
} from 'schema-dts';
import type { BreadcrumbCrumb } from '@/lib/optimizely/get-breadcrumb-trail';
import { getPerson } from '@/lib/optimizely/get-person';
import type { SiteSettings } from '@/lib/optimizely/get-site-settings';
import { decodeRichTextEntities, extractText } from '@/lib/rich-text';

const SCHEMA_CONTEXT = 'https://schema.org';

export type JsonLdContext = {
  locale: string;
  siteSettings: SiteSettings;
  siteUrl: string | null;
  pageUrl: string | null;
  isLocaleRoot: boolean;
  // Ordered breadcrumb trail (Home → … → self) resolved from the page's URL
  // ancestry. Built in the route (it triggers Graph fetches) and passed in so
  // this module stays fetch-free. Undefined/short trails emit no BreadcrumbList.
  breadcrumbTrail?: BreadcrumbCrumb[];
};

type Content = Record<string, unknown>;

// ── small extractors (typed access into the loosely-typed Graph payload) ────

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function readSeo(content: Content): Content {
  return (content.seo as Content | undefined) ?? {};
}

function readMetadata(content: Content): Content {
  return (content._metadata as Content | undefined) ?? {};
}

function readTypes(content: Content): string[] {
  const types = (readMetadata(content).types as unknown[] | undefined) ?? [];
  return types.filter((t): t is string => typeof t === 'string');
}

function readMetadataUrl(content: Content): string | null {
  const url = readMetadata(content).url as Content | undefined;
  return readString(url?.default);
}

function readImageUrl(value: unknown): string | null {
  const ref = value as Content | undefined;
  const url = ref?.url as Content | undefined;
  return readString(url?.default);
}

// URL properties (linkedIn, xtwitter, …) come back as an InferredUrl object
// — the actual address lives on `.default`. Returns null when the field is
// empty or doesn't carry a usable default.
function readUrlValue(value: unknown): string | null {
  if (typeof value === 'string') return readString(value);
  const obj = value as Content | undefined;
  return readString(obj?.default);
}

function collectUrls(values: unknown[]): string[] {
  return values
    .map((v) => readUrlValue(v))
    .filter((u): u is string => u !== null);
}

// ── parsers for the new SeoBlock fields ─────────────────────────────────────

function parseKeywords(raw: unknown): string[] {
  const s = readString(raw);
  if (!s) return [];
  return s
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean);
}

function parseAboutTopics(raw: unknown): Thing[] {
  const s = readString(raw);
  if (!s) return [];
  return s
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map<Thing>((name) => ({ '@type': 'Thing', name }));
}

function parseSpeakable(raw: unknown): SpeakableSpecification | null {
  const s = readString(raw);
  if (!s) return null;
  const selectors = s
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (selectors.length === 0) return null;
  return { '@type': 'SpeakableSpecification', cssSelector: selectors };
}

// Full-replace escape hatch. Accepts either a single object or an array of
// schema objects. The CMS stores it as a string — we parse with try/catch and
// log on failure so a typo doesn't blank the page's JSON-LD entirely.
function parseCustomJsonLd(raw: unknown): WithContext<Thing> | WithContext<Thing>[] | null {
  const s = readString(raw);
  if (!s) return null;
  try {
    const parsed = JSON.parse(s);
    if (parsed && typeof parsed === 'object') {
      return parsed as WithContext<Thing> | WithContext<Thing>[];
    }
    return null;
  } catch (e) {
    console.warn('[json-ld] customJsonLd is not valid JSON; falling back to defaults.', e);
    return null;
  }
}

// ── shared builders (Organization, WebSite, author Person) ──────────────────

function buildOrganization(s: SiteSettings): Organization | null {
  if (!s.organization.legalName && !s.siteName && !s.logoUrl) return null;
  const org: Organization = {
    '@type': 'Organization',
    name: s.organization.legalName ?? s.siteName ?? undefined,
    url: s.siteUrl ?? undefined,
  };
  if (s.logoUrl) {
    org.logo = { '@type': 'ImageObject', url: s.logoUrl } satisfies ImageObject;
  }
  if (s.organization.description) org.description = s.organization.description;
  if (s.organization.sameAs.length > 0) org.sameAs = s.organization.sameAs;
  if (s.organization.contactEmail || s.organization.contactPhone) {
    org.contactPoint = {
      '@type': 'ContactPoint',
      email: s.organization.contactEmail ?? undefined,
      telephone: s.organization.contactPhone ?? undefined,
      contactType: 'customer support',
    };
  }
  if (s.organization.addressLocality || s.organization.addressCountry) {
    org.address = {
      '@type': 'PostalAddress',
      addressLocality: s.organization.addressLocality ?? undefined,
      addressCountry: s.organization.addressCountry ?? undefined,
    };
  }
  return org;
}

function buildWebSite(s: SiteSettings): WebSite | null {
  if (!s.siteUrl || !s.siteName) return null;
  return {
    '@type': 'WebSite',
    url: s.siteUrl,
    name: s.siteName,
  };
}

async function buildAuthorPerson(authorRef: unknown): Promise<Person | null> {
  const ref = authorRef as Content | undefined;
  const urlNode = ref?.url as Content | undefined;
  const path = readString(urlNode?.default);
  if (!path) return null;
  const host = readString(urlNode?.base);
  const author = await getPerson(path, host ?? undefined);
  if (!author) return null;

  const sameAs = collectUrls([
    author.linkedIn,
    author.xtwitter,
    author.facebook,
    author.instagram,
    author.youTube,
    author.tikTok,
  ]);
  const imageUrl = readImageUrl(author.image);

  const person: Person = {
    '@type': 'Person',
    name: author.name ?? undefined,
    jobTitle: author.title ?? undefined,
    url: path,
  };
  if (imageUrl) person.image = imageUrl;
  if (sameAs.length > 0) person.sameAs = sameAs;
  return person;
}

// ── per-content-type primary schema builders ────────────────────────────────

type CommonFields = {
  name: string | null;
  description: string | null;
  imageUrl: string | null;
  datePublished: string | null;
  dateModified: string | null;
};

function readCommonFields(content: Content): CommonFields {
  const seo = readSeo(content);
  const meta = readMetadata(content);
  const featured = readImageUrl(content.featuredImage);
  const og = readImageUrl(seo.openGraphImage);
  return {
    name: readString(seo.metaTitle) ?? readString(content.heading) ?? readString(content.name) ?? readString(meta.displayName),
    description: readString(seo.metaDescription) ?? readString(content.ingress),
    imageUrl: og ?? featured,
    datePublished: readString(seo.datePublishedOverride) ?? readString(meta.published),
    dateModified: readString(seo.dateModifiedOverride) ?? readString(meta.lastModified) ?? readString(meta.published),
  };
}

function applySchemaExtras(node: Article | WebPage | ProfilePage, content: Content): void {
  const seo = readSeo(content);
  const keywords = parseKeywords(seo.keywords);
  const about = parseAboutTopics(seo.aboutTopics);
  const speakable = parseSpeakable(seo.speakableSelectors);
  if (keywords.length > 0) node.keywords = keywords;
  if (about.length > 0) node.about = about;
  if (speakable) node.speakable = speakable;
}

async function buildArticle(content: Content, ctx: JsonLdContext): Promise<Article> {
  const seo = readSeo(content);
  const common = readCommonFields(content);
  const schemaType = (readString(seo.schemaType) as Article['@type']) ?? 'Article';
  const author = await buildAuthorPerson(content.author);
  const publisher = buildOrganization(ctx.siteSettings);

  const node: Article = {
    '@type': schemaType,
    headline: common.name ?? undefined,
    description: common.description ?? undefined,
    image: common.imageUrl ?? undefined,
    datePublished: common.datePublished ?? undefined,
    dateModified: common.dateModified ?? undefined,
    inLanguage: ctx.locale,
    mainEntityOfPage: ctx.pageUrl ?? undefined,
    articleSection: readString(content.category) ?? undefined,
  };
  if (author) node.author = author;
  if (publisher) node.publisher = publisher;
  applySchemaExtras(node, content);
  return node;
}

function buildPerson(content: Content): Person {
  const sameAs = collectUrls([
    content.linkedIn,
    content.xtwitter,
    content.facebook,
    content.instagram,
    content.youTube,
    content.tikTok,
  ]);
  const imageUrl = readImageUrl(content.image);
  const person: Person = {
    '@type': 'Person',
    name: readString(content.name) ?? undefined,
    jobTitle: readString(content.title) ?? undefined,
    url: readMetadataUrl(content) ?? undefined,
  };
  if (imageUrl) person.image = imageUrl;
  if (sameAs.length > 0) person.sameAs = sameAs;
  return person;
}

function buildProfilePage(content: Content, ctx: JsonLdContext): ProfilePage {
  const seo = readSeo(content);
  const common = readCommonFields(content);
  const schemaType = (readString(seo.schemaType) as ProfilePage['@type']) ?? 'ProfilePage';
  const node: ProfilePage = {
    '@type': schemaType,
    name: common.name ?? undefined,
    description: common.description ?? undefined,
    inLanguage: ctx.locale,
    url: ctx.pageUrl ?? undefined,
    mainEntity: buildPerson(content),
  };
  applySchemaExtras(node, content);
  return node;
}

function buildWebPage(content: Content, ctx: JsonLdContext): WebPage {
  const seo = readSeo(content);
  const common = readCommonFields(content);
  const schemaType = (readString(seo.schemaType) as WebPage['@type']) ?? 'WebPage';
  const node: WebPage = {
    '@type': schemaType,
    name: common.name ?? undefined,
    description: common.description ?? undefined,
    image: common.imageUrl ?? undefined,
    inLanguage: ctx.locale,
    url: ctx.pageUrl ?? undefined,
    datePublished: common.datePublished ?? undefined,
    dateModified: common.dateModified ?? undefined,
  };
  applySchemaExtras(node, content);
  return node;
}

// ── FAQPage (derived from Accordion blocks in a page's content area) ─────────

// Pull the list of types off a block node. Composition blocks carry their
// content-type key in `_metadata.types` (e.g. ['AccordionBlock', '_component']),
// same shape as a page.
function blockHasType(block: unknown, key: string): boolean {
  const meta = (block as Content | undefined)?._metadata as Content | undefined;
  const types = (meta?.types as unknown[] | undefined) ?? [];
  return types.some((t) => t === key);
}

// One Accordion row → a schema.org Question. `summary` is a plain string; the
// answer body is RichText (Slate JSON) flattened to text — rich answers aren't
// allowed in FAQPage answer text. Entities are decoded first so e.g. Norwegian
// letters stored as `&aring;` don't leak into the answer.
function accordionItemToQuestion(item: unknown): Question | null {
  const obj = item as Content | undefined;
  const name = readString(obj?.summary);
  if (!name) return null;
  const bodyJson = (obj?.body as Content | undefined)?.json;
  const answer = extractText(decodeRichTextEntities(bodyJson)).trim();
  if (!answer) return null;
  return {
    '@type': 'Question',
    name,
    acceptedAnswer: { '@type': 'Answer', text: answer },
  };
}

// Walk a page's `additionalContent` slot, collect every AccordionBlock's items,
// and emit a single FAQPage covering all of them. Returns null when there are
// no usable Q&A pairs (no accordion, or every item missing summary/body) so the
// caller can skip it.
//
// NOTE: AccordionBlock.items are not localized (see project memory) — on a
// non-default-locale page the questions/answers carry the canonical-locale
// text. Acceptable: the schema still describes real on-page content.
function buildFaqPage(content: Content): FAQPage | null {
  const blocks = (content.additionalContent as unknown[] | undefined) ?? [];
  const questions: Question[] = [];
  for (const block of blocks) {
    if (!blockHasType(block, 'AccordionBlock')) continue;
    const items = ((block as Content).items as unknown[] | undefined) ?? [];
    for (const item of items) {
      const q = accordionItemToQuestion(item);
      if (q) questions.push(q);
    }
  }
  if (questions.length === 0) return null;
  return { '@type': 'FAQPage', mainEntity: questions };
}

// ── BreadcrumbList (derived from the page's URL ancestry) ────────────────────

// Emit a schema.org BreadcrumbList from a resolved trail. The trail already
// excludes folder segments and noIndex ancestors (see get-breadcrumb-trail), so
// here we only map it to ListItems. A trail with fewer than two crumbs isn't a
// breadcrumb (just Home, or just self) → null, so shallow pages and the locale
// root emit nothing. Each ListItem's `item` is the absolute URL, including the
// final self crumb (Google accepts and prefers this).
function buildBreadcrumbList(trail: BreadcrumbCrumb[] | undefined): BreadcrumbList | null {
  if (!trail || trail.length < 2) return null;
  const itemListElement = trail.map<ListItem>((crumb, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    name: crumb.name,
    item: crumb.url,
  }));
  return { '@type': 'BreadcrumbList', itemListElement };
}

// ── top-level dispatcher ────────────────────────────────────────────────────

function withContext(node: Thing): WithContext<Thing> {
  // schema-dts Thing is a wide union (it includes string-only role refs);
  // every node we build is an object, so the cast is safe in practice.
  return { '@context': SCHEMA_CONTEXT, ...(node as object) } as WithContext<Thing>;
}

/**
 * Build the JSON-LD `@graph` for a CMS-resolved page. Returns either a
 * single context-wrapped object, an array of them, or null when there is
 * nothing meaningful to emit.
 *
 * Precedence:
 *   1. SeoBlock.customJsonLd (full replace) wins if it parses.
 *   2. Otherwise the dispatcher picks a primary schema based on the
 *      content type, applies common SeoBlock fields, and (at the locale
 *      root) adds Organization + WebSite for site identity.
 *
 * Async because Article author fetches the linked PersonPage to emit a
 * full author entity with sameAs profiles — high GEO value, but it's a
 * cached call so the cost is one Graph fetch per author per cache life.
 */
export async function buildJsonLd(
  content: Content,
  ctx: JsonLdContext,
): Promise<WithContext<Thing>[] | null> {
  const seo = readSeo(content);
  const custom = parseCustomJsonLd(seo.customJsonLd);
  if (custom) return Array.isArray(custom) ? custom : [custom];

  const types = readTypes(content);
  const graph: Thing[] = [];

  if (types.includes('ArticlePage')) {
    graph.push(await buildArticle(content, ctx));
  } else if (types.includes('PersonPage')) {
    graph.push(buildProfilePage(content, ctx));
  } else {
    graph.push(buildWebPage(content, ctx));
  }

  // Derive a FAQPage from any Accordion block in the page's content area.
  // Eligible for FAQ rich results in Search and a strong GEO/AEO signal. Added
  // alongside the primary node (Article/WebPage/etc.) in the same @graph.
  const faq = buildFaqPage(content);
  if (faq) graph.push(faq);

  // BreadcrumbList from the page's URL ancestry. Skipped at the locale root
  // (the homepage has no meaningful trail) and whenever the trail is too short.
  if (!ctx.isLocaleRoot) {
    const breadcrumbs = buildBreadcrumbList(ctx.breadcrumbTrail);
    if (breadcrumbs) graph.push(breadcrumbs);
  }

  // Add site identity at the locale root (homepage). Google + LLM crawlers
  // pick these up regardless of which page they crawl, but emitting them on
  // the homepage is the canonical placement.
  if (ctx.isLocaleRoot) {
    const org = buildOrganization(ctx.siteSettings);
    if (org) graph.push(org);
    const site = buildWebSite(ctx.siteSettings);
    if (site) graph.push(site);
  }

  if (graph.length === 0) return null;
  return graph.map((node) => withContext(node));
}
