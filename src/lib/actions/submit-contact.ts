'use server';

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
};

export type ContactSubmitResult = { ok: true } | { ok: false; error: string };

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

  return { ok: true };
}
