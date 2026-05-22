import { ContentProps, getClient, damAssets } from '@optimizely/cms-sdk';
import { getPreviewUtils } from '@optimizely/cms-sdk/react/server';
import { cacheLife, cacheTag } from 'next/cache';
import { PersonElementCT } from '@/content-types/PersonElement';
import { PersonPageCT } from '@/content-types/PersonPage';
import { getPageTag } from '@/lib/cache/cache-keys';
import { LinkedInIcon } from '@/components/ui';
import Image from 'next/image';

type Props = {
  content: ContentProps<typeof PersonElementCT>;
};

type PersonData = ContentProps<typeof PersonPageCT>;

async function getPerson(path: string, host?: string): Promise<PersonData | null> {
  'use cache';
  cacheLife('max');
  cacheTag(getPageTag(path.split('/').filter(Boolean)));

  try {
    const client = getClient();
    const results = await client.getContentByPath(path, { host: host ?? undefined });
    return results?.[0] ?? null;
  } catch (e) {
    console.error('[PersonElement] graph lookup failed:', e);
    return null;
  }
}

export default async function PersonElement({ content }: Props) {
  const { pa } = getPreviewUtils(content);

  const personPath = content.person?.url?.default;
  const personHost = content.person?.url?.base;
  if (!personPath) return null;

  const person = await getPerson(
    String(personPath),
    personHost ? String(personHost) : undefined
  );
  if (!person) return null;

  const { src } = getPreviewUtils(person);
  const { getAlt } = damAssets(person);
  const imageUrl = src(person.image);

  return (
    <div className="flex items-center gap-4" {...pa('person')}>
      {imageUrl && (
        <div className="relative w-16 h-16 shrink-0 rounded-full overflow-hidden ring-2 ring-border">
          <Image
            src={imageUrl}
            alt={getAlt(person.image, person.name ?? 'Person')}
            fill
            className="object-cover"
            sizes="64px"
          />
        </div>
      )}

      <div className="min-w-0">
        <p className="font-semibold text-foreground truncate">{person.name}</p>
        {person.title && (
          <p className="text-sm text-muted-foreground truncate">{person.title}</p>
        )}
        {person.linkedIn && (
          <a
            href={String(person.linkedIn)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mt-1"
          >
            <LinkedInIcon className="w-4 h-4" />
            LinkedIn
          </a>
        )}
      </div>
    </div>
  );
}
