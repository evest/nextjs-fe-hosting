import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

/**
 * Encrypted "which page was the contact form submitted from" token.
 *
 * After a successful submission the visitor is sent to the CMS-configured
 * thank-you page with `?ref=<token>`. The token carries the content key (GUID)
 * of the page the form was on, encrypted and authenticated with a key shared
 * with the analytics pipeline. That gives us:
 *
 * - **Only real posts are counted.** A token can only be minted by the server
 *   action after a submission passes validation. Anyone can request
 *   `/thank-you?ref=garbage`, but without the key they can't produce a token
 *   that decrypts, so it is dropped at ingest instead of polluting the logs.
 * - **No information leak.** The query string (visible in browser history,
 *   referrers and log exports) doesn't reveal internal content keys.
 *
 * Token format (versioned so the key can be rotated later):
 *
 *   base64url( version[1] | iv[12] | ciphertext[n] | authTag[16] )
 *
 *   version  0x01 = AES-256-GCM with CONTACT_REF_KEY; the version byte is
 *            also passed as AAD, so it can't be swapped without failing auth
 *   plaintext UTF-8 JSON: { "k": "<content key>", "l": "<locale>", "t": <unix seconds> }
 *
 * Decrypting elsewhere (e.g. the analytics ingest), pseudocode:
 *
 *   raw = base64url_decode(token); assert raw[0] == 1
 *   iv = raw[1:13]; tag = raw[-16:]; ct = raw[13:-16]
 *   json = AES_256_GCM_decrypt(key, iv, ct, tag, aad = raw[0:1])
 *
 * Replay: a valid token can be copied and re-requested. The analytics side
 * should count each distinct token once (the random IV makes every token
 * unique, even for the same page) and may reject tokens whose `t` is older
 * than its ingest window.
 *
 * Key: 32 random bytes, base64-encoded, in CONTACT_REF_KEY. Generate with
 *   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
 */

export { CONTACT_REF_PARAM } from '@/lib/contact-ref-param';

const VERSION = 0x01;
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

export type ContactRefPayload = {
  /** Content key (GUID) of the page the form was submitted from. */
  k: string;
  /** Locale of that page. */
  l: string;
  /** Issued at, unix seconds. */
  t: number;
};

let warnedMissingKey = false;

function getKey(): Buffer | null {
  const raw = process.env.CONTACT_REF_KEY?.trim();
  if (!raw) {
    if (!warnedMissingKey) {
      warnedMissingKey = true;
      console.warn('[contact-ref] CONTACT_REF_KEY is not set; thank-you redirects will carry no ref token');
    }
    return null;
  }
  const key = Buffer.from(raw, 'base64');
  if (key.length !== 32) {
    throw new Error(`CONTACT_REF_KEY must be 32 bytes base64-encoded (got ${key.length} bytes)`);
  }
  return key;
}

/** Returns the token, or null when no key is configured. */
export function encryptContactRef(contentKey: string, locale: string): string | null {
  const key = getKey();
  if (!key) return null;

  const payload: ContactRefPayload = { k: contentKey, l: locale, t: Math.floor(Date.now() / 1000) };
  const header = Buffer.from([VERSION]);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv('aes-256-gcm', key, iv, { authTagLength: TAG_LENGTH });
  cipher.setAAD(header);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(payload), 'utf8'), cipher.final()]);
  return Buffer.concat([header, iv, ciphertext, cipher.getAuthTag()]).toString('base64url');
}

/**
 * Returns the payload, or null for anything that isn't a token we issued
 * (wrong key, tampered, truncated, unknown version). Never throws on input.
 * For use on the thank-you page if it ever needs to know the source page.
 */
export function decryptContactRef(token: string | null | undefined): ContactRefPayload | null {
  if (!token || token.length > 512) return null;
  const key = getKey();
  if (!key) return null;

  try {
    const raw = Buffer.from(token, 'base64url');
    if (raw.length <= 1 + IV_LENGTH + TAG_LENGTH || raw[0] !== VERSION) return null;
    const iv = raw.subarray(1, 1 + IV_LENGTH);
    const tag = raw.subarray(raw.length - TAG_LENGTH);
    const ciphertext = raw.subarray(1 + IV_LENGTH, raw.length - TAG_LENGTH);
    const decipher = createDecipheriv('aes-256-gcm', key, iv, { authTagLength: TAG_LENGTH });
    decipher.setAAD(raw.subarray(0, 1));
    decipher.setAuthTag(tag);
    const json = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
    const payload = JSON.parse(json) as ContactRefPayload;
    if (typeof payload?.k !== 'string' || typeof payload.t !== 'number') return null;
    return payload;
  } catch {
    return null;
  }
}
