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
