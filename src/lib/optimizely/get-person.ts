import { ContentProps, getClient } from '@optimizely/cms-sdk';
import { cacheLife, cacheTag } from 'next/cache';
import { PersonPageCT } from '@/content-types/PersonPage';
import { getPageTag } from '@/lib/cache/cache-keys';

export type PersonData = ContentProps<typeof PersonPageCT>;

export async function getPerson(path: string, host?: string): Promise<PersonData | null> {
  'use cache';
  cacheLife('max');
  cacheTag(getPageTag(path.split('/').filter(Boolean)));

  try {
    const client = getClient();
    const results = await client.getContentByPath(path, { host: host ?? undefined });
    return results?.[0] ?? null;
  } catch (e) {
    console.error('[get-person] graph lookup failed:', e);
    return null;
  }
}
