/**
 * Query-string parameter carrying the encrypted source-page token on the
 * contact form's thank-you redirect. Kept apart from contact-ref.ts (which
 * imports node:crypto) so the client form can import it too.
 */
export const CONTACT_REF_PARAM = 'ref';
