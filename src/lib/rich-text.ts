import { decode } from 'he';

/**
 * Some legacy / imported article bodies have HTML entities (`&aring;`,
 * `&nbsp;`, etc.) stored as literal text inside Slate JSON nodes. The
 * SDK's renderer only decodes seven entities, so Norwegian and other
 * named-entity letters survive to the page. This walks the tree and
 * decodes every text node up front, idempotently — already-decoded text
 * is unaffected by `he.decode`.
 *
 * Apply this before passing rich text JSON into `<RichText content={...} />`.
 */
export function decodeRichTextEntities<T>(node: T): T {
  if (node === null || typeof node !== 'object') return node;
  if (Array.isArray(node)) return node.map(decodeRichTextEntities) as unknown as T;
  const obj = node as Record<string, unknown>;
  const next: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (k === 'text' && typeof v === 'string') {
      next[k] = decode(v);
    } else {
      next[k] = decodeRichTextEntities(v);
    }
  }
  return next as T;
}

function extractText(node: unknown): string {
  if (node == null) return '';
  if (typeof node === 'string') return node;
  if (Array.isArray(node)) return node.map(extractText).join(' ');
  if (typeof node === 'object') {
    const obj = node as Record<string, unknown>;
    const parts: string[] = [];
    if (typeof obj.text === 'string') parts.push(obj.text);
    if (Array.isArray(obj.children)) parts.push(...obj.children.map(extractText));
    return parts.join(' ');
  }
  return '';
}

/** Reading time in minutes from a Slate rich-text tree (~200 wpm), or null if empty. */
export function getReadingTime(node: unknown, wordsPerMinute = 200): number | null {
  const text = extractText(node).trim();
  if (!text) return null;
  const words = text.split(/\s+/).length;
  return Math.max(1, Math.round(words / wordsPerMinute));
}
