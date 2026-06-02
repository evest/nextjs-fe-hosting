import type { LlmsEntry } from '@/lib/optimizely/get-llms-index';
import type { SiteSettings } from '@/lib/optimizely/get-site-settings';
import { richTextToMarkdown } from '@/lib/rich-text-to-markdown';
import { routing } from '@/i18n/routing';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, '') ?? '';

// Locale used for the *root* /llms.txt and /llms-full.txt header (site name +
// description). The root files are the locale-agnostic entry point, so they
// present in English — the international default — independent of
// routing.defaultLocale (which is 'no'). Per-locale routes use their own locale.
export const ROOT_LLMS_LOCALE = 'en';

// Section + locale labels live here (not in the i18n message catalog) because
// the llms.txt audience is LLM crawlers — we only need three section headers
// and four language names. Keeping them inline avoids cluttering the editor-
// facing translations.
const LOCALE_NAMES: Record<string, string> = {
  en: 'English',
  no: 'Norsk',
  sv: 'Svenska',
  da: 'Dansk',
};

type Labels = {
  articles: string;
  people: string;
  landing: string;
};

const LABELS: Record<string, Labels> = {
  en: { articles: 'Articles', people: 'People', landing: 'Landing pages' },
  no: { articles: 'Artikler', people: 'Personer', landing: 'Landingssider' },
  sv: { articles: 'Artiklar', people: 'Personer', landing: 'Landningssidor' },
  da: { articles: 'Artikler', people: 'Personer', landing: 'Landingssider' },
};

function labelsFor(locale: string): Labels {
  return LABELS[locale] ?? LABELS.en;
}

function localeName(locale: string): string {
  return LOCALE_NAMES[locale] ?? locale;
}

function absUrl(path: string): string {
  const clean = path.replace(/\/$/, '') || '/';
  return SITE_URL ? `${SITE_URL}${clean}` : clean;
}

function renderEntry(e: LlmsEntry): string {
  const link = `[${e.title}](${absUrl(e.url)})`;
  return e.description ? `- ${link}: ${e.description}` : `- ${link}`;
}

function renderSection(title: string, entries: LlmsEntry[]): string {
  if (entries.length === 0) return '';
  return `### ${title}\n${entries.map(renderEntry).join('\n')}\n`;
}

function renderLocaleBlock(locale: string, entries: LlmsEntry[], depth: '##' | '###'): string {
  const labels = labelsFor(locale);
  const articles = entries.filter((e) => e.type === 'article');
  const people = entries.filter((e) => e.type === 'person');
  const landing = entries.filter((e) => e.type === 'landing');
  const sections: string[] = [];
  if (depth === '##') {
    sections.push(`## ${localeName(locale)} (${locale})\n`);
  }
  sections.push(renderSection(labels.articles, articles));
  sections.push(renderSection(labels.people, people));
  sections.push(renderSection(labels.landing, landing));
  return sections.filter(Boolean).join('\n');
}

// The header (name + description) reflects whichever locale's SiteSettings the
// caller fetched — callers pick the locale, this just renders it.
function renderHeader(siteSettings: SiteSettings): string {
  const name = siteSettings.siteName ?? 'Site';
  const description =
    siteSettings.llmsDescription ?? siteSettings.organization.description ?? null;
  const lines = [`# ${name}`];
  if (description) lines.push('', `> ${description}`);
  return lines.join('\n') + '\n\n';
}

/**
 * Render the slim /llms.txt for a single locale. Lists every indexable page
 * grouped by type, with title + description but no body.
 */
export function renderLocaleLlms(
  locale: string,
  entries: LlmsEntry[],
  siteSettings: SiteSettings,
): string {
  const localeEntries = entries.filter((e) => e.locale === locale);
  return renderHeader(siteSettings) + renderLocaleBlock(locale, localeEntries, '###').trim() + '\n';
}

/**
 * Render the slim /llms.txt at the site root. Lists every locale's content
 * under a per-locale heading. The international default locale appears first.
 */
export function renderRootLlms(entries: LlmsEntry[], siteSettings: SiteSettings): string {
  const locales = [ROOT_LLMS_LOCALE, ...routing.locales.filter((l) => l !== ROOT_LLMS_LOCALE)];
  const blocks = locales
    .map((locale) => renderLocaleBlock(locale, entries.filter((e) => e.locale === locale), '##'))
    .filter((b) => b.trim().length > 0);
  return renderHeader(siteSettings) + blocks.join('\n').trim() + '\n';
}

function renderFullArticleBody(e: LlmsEntry): string {
  if (e.type !== 'article' && e.type !== 'person') return '';
  if (!e.body) return '';
  const md = richTextToMarkdown(e.body);
  return md ? `\n\n${md}` : '';
}

function renderFullEntry(e: LlmsEntry): string {
  const lines = [`## ${e.title}`];
  lines.push('', `URL: ${absUrl(e.url)}`);
  if (e.description) lines.push('', e.description);
  if (e.published) lines.push('', `Published: ${e.published}`);
  const body = renderFullArticleBody(e);
  if (body) lines.push(body);
  return lines.join('\n');
}

function renderFullLocaleBlock(locale: string, entries: LlmsEntry[]): string {
  const labels = labelsFor(locale);
  const groups: { title: string; items: LlmsEntry[] }[] = [
    { title: labels.articles, items: entries.filter((e) => e.type === 'article') },
    { title: labels.people, items: entries.filter((e) => e.type === 'person') },
    { title: labels.landing, items: entries.filter((e) => e.type === 'landing') },
  ];
  const sections = groups
    .filter((g) => g.items.length > 0)
    .map((g) => `# ${g.title} — ${localeName(locale)} (${locale})\n\n${g.items.map(renderFullEntry).join('\n\n---\n\n')}`);
  return sections.join('\n\n');
}

/**
 * Render /llms-full.txt for a single locale — full article/bio bodies in
 * markdown, ingress-only for landing pages and other non-body content.
 */
export function renderLocaleLlmsFull(
  locale: string,
  entries: LlmsEntry[],
  siteSettings: SiteSettings,
): string {
  const localeEntries = entries.filter((e) => e.locale === locale);
  return renderHeader(siteSettings) + renderFullLocaleBlock(locale, localeEntries) + '\n';
}

/**
 * Render the root /llms-full.txt — every locale's full content concatenated
 * with locale headers. The international default locale appears first.
 */
export function renderRootLlmsFull(entries: LlmsEntry[], siteSettings: SiteSettings): string {
  const locales = [ROOT_LLMS_LOCALE, ...routing.locales.filter((l) => l !== ROOT_LLMS_LOCALE)];
  const blocks = locales
    .map((locale) => renderFullLocaleBlock(locale, entries.filter((e) => e.locale === locale)))
    .filter((b) => b.trim().length > 0);
  return renderHeader(siteSettings) + blocks.join('\n\n') + '\n';
}
