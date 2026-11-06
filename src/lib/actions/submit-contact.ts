'use server';

import { hasLocale } from 'next-intl';
import { routing } from '@/i18n/routing';
import { getPageContent } from '@/lib/optimizely/get-page';
import { encryptContactRef } from '@/lib/contact-ref';

/**
 * Contact form submission handler.
 *
 * Currently a stub: it logs the submission server-side and returns
 * success. Wire up the real destination when one is chosen — likely
 * either a webhook (CONTACT_FORM_WEBHOOK_URL) or a direct integration
 * with a marketing platform (HubSpot, ActiveCampaign, etc.).
 *
 * Validation here is intentionally minimal — server-side validation
 * should be added before going live. The client form already enforces
 * `required` on the critical fields.
 */
export type ContactSubmission = {
  name: string;
  company?: string;
  email: string;
  phone?: string;
  message: string;
  locale?: string;
  /**
   * Pathname the form was submitted from (e.g. `/en/about`). Resolved to a
   * content key server-side, so the client never supplies the key itself.
   */
  pagePath?: string;
};

export type ContactSubmitResult =
  | {
      ok: true;
      /** Encrypted source-page token for the thank-you redirect (see contact-ref.ts). */
      ref?: string;
    }
  | { ok: false; error: string };

export async function submitContact(data: ContactSubmission): Promise<ContactSubmitResult> {
  if (!data.name?.trim() || !data.email?.trim() || !data.message?.trim()) {
    return { ok: false, error: 'Missing required fields' };
  }

  // TODO: replace with real delivery.
  console.info('[contact] submission received', {
    name: data.name,
    company: data.company,
    email: data.email,
    phone: data.phone,
    locale: data.locale,
    messageLength: data.message.length,
  });

  const ref = await getSourcePageRef(data.pagePath);
  return { ok: true, ...(ref && { ref }) };
}

// Maps the submitting page's path to its CMS content key and encrypts it.
// Anything that isn't a routable CMS page (preview route, unknown path,
// Graph outage) yields no token rather than failing the submission.
async function getSourcePageRef(pagePath: string | undefined): Promise<string | null> {
  if (typeof pagePath !== 'string' || pagePath.length > 1024) return null;
  const slug = pagePath.split('/').filter(Boolean).map(safeDecode);
  const locale = slug[0];
  if (!locale || !hasLocale(routing.locales, locale)) return null;

  const page = (await getPageContent(slug)) as { _metadata?: { key?: unknown } } | null;
  const key = page?._metadata?.key;
  if (typeof key !== 'string' || !key) return null;

  try {
    return encryptContactRef(key, locale);
  } catch (e) {
    console.error('[contact] could not create ref token:', e);
    return null;
  }
}

function safeDecode(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}
