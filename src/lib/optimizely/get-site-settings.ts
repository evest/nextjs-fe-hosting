import { getClient } from '@optimizely/cms-sdk';
import { cacheLife, cacheTag } from 'next/cache';
import { getSiteSettingsTag } from '@/lib/cache/cache-keys';

/**
 * Merged site-settings shape used by buildJsonLd / llms.txt. Values come from
 * the CMS SiteSettings singleton first, then env-var fallbacks, then null.
 * Consumers don't need to know which layer answered.
 */
export type SiteSettings = {
  siteName: string | null;
  siteUrl: string | null;
  logoUrl: string | null;
  defaultOgImageUrl: string | null;
  llmsDescription: string | null;
  organization: {
    legalName: string | null;
    description: string | null;
    sameAs: string[];
    contactEmail: string | null;
    contactPhone: string | null;
    addressLocality: string | null;
    addressCountry: string | null;
  };
};

const QUERY = `
  query SiteSettingsQuery($locale: [Locales]) {
    SiteSettings(locale: $locale, limit: 1) {
      items {
        siteName
        logo { url { default } }
        defaultOgImage { url { default } }
        llmsDescription
        legalName
        organizationDescription
        sameAs { default }
        contactEmail
        contactPhone
        addressLocality
        addressCountry
      }
    }
  }
`;

type RawUrl = { default?: string | null } | null;

type RawSiteSettings = {
  siteName?: string | null;
  logo?: { url?: RawUrl } | null;
  defaultOgImage?: { url?: RawUrl } | null;
  llmsDescription?: string | null;
  legalName?: string | null;
  organizationDescription?: string | null;
  sameAs?: (RawUrl | null)[] | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  addressLocality?: string | null;
  addressCountry?: string | null;
};

const FALLBACK_SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? null;
const FALLBACK_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, '') ?? null;

function merge(raw: RawSiteSettings | null): SiteSettings {
  const sameAs = (raw?.sameAs ?? [])
    .map((u) => u?.default ?? null)
    .filter((s): s is string => typeof s === 'string' && s.length > 0);
  return {
    siteName: raw?.siteName ?? FALLBACK_SITE_NAME,
    siteUrl: FALLBACK_SITE_URL,
    logoUrl: raw?.logo?.url?.default ?? null,
    defaultOgImageUrl: raw?.defaultOgImage?.url?.default ?? null,
    llmsDescription: raw?.llmsDescription ?? null,
    organization: {
      legalName: raw?.legalName ?? null,
      description: raw?.organizationDescription ?? null,
      sameAs,
      contactEmail: raw?.contactEmail ?? null,
      contactPhone: raw?.contactPhone ?? null,
      addressLocality: raw?.addressLocality ?? null,
      addressCountry: raw?.addressCountry ?? null,
    },
  };
}

/**
 * Fetch the SiteSettings singleton for the given locale. Returns the merged
 * shape (CMS value → env var → null) so call sites can read a single object.
 *
 * Cached indefinitely; the /hooks/graph webhook is responsible for purging
 * the `opti-site-settings:<locale>` tag on any SiteSettings publish event.
 * In local dev where the webhook can't reach localhost, the cache is kept
 * short so editor changes surface without a manual purge — same trade-off
 * as getPageContent.
 *
 * Graph failures degrade gracefully: callers get the env-only fallback so
 * JSON-LD and llms.txt still emit something rather than crashing the page.
 */
export async function getSiteSettings(locale: string): Promise<SiteSettings> {
  'use cache';
  if (process.env.NODE_ENV === 'production') {
    cacheLife('max');
  } else {
    cacheLife('minutes');
  }
  cacheTag(getSiteSettingsTag(locale));

  try {
    const client = getClient();
    const data = (await client.request(QUERY, { locale: [locale] })) as {
      SiteSettings?: { items?: RawSiteSettings[] | null } | null;
    };
    const raw = data?.SiteSettings?.items?.[0] ?? null;
    return merge(raw);
  } catch (e) {
    console.error('[get-site-settings] graph query failed:', e);
    return merge(null);
  }
}
