import { notFound } from 'next/navigation';

// SiteSettings is a singleton _page consumed by buildJsonLd / llms.txt only —
// it is never meant to render as a public page. notFound() guarantees that
// even if an editor accidentally publishes it under a routable URL, the
// frontend serves a 404 instead of leaking the raw settings payload.
export default function SiteSettings(): never {
  notFound();
}
