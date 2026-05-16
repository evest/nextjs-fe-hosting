import type { MetadataRoute } from 'next';
import { getAllContentPaths } from '@/lib/optimizely/all-content-paths';
import { routing } from '@/i18n/routing';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/+$/, '');

function toAbsolute(path: string): string {
  const trimmed = path.replace(/\/$/, '');
  return `${SITE_URL}${trimmed || '/'}`;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const paths = await getAllContentPaths();
  const now = new Date();

  // Dedupe by absolute URL — locale roots may also appear in the CMS payload.
  const entries = new Map<string, MetadataRoute.Sitemap[number]>();

  for (const locale of routing.locales) {
    const url = toAbsolute(`/${locale}`);
    entries.set(url, {
      url,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1,
    });
  }

  for (const { url: rawUrl, published } of paths) {
    const url = toAbsolute(rawUrl);
    entries.set(url, {
      url,
      lastModified: published ? new Date(published) : now,
      changeFrequency: 'monthly',
      priority: entries.has(url) ? 1 : 0.6,
    });
  }

  return Array.from(entries.values());
}
