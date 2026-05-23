import { ContentProps, damAssets } from '@optimizely/cms-sdk';
import { getPreviewUtils } from '@optimizely/cms-sdk/react/server';
import { PersonElementCT } from '@/content-types/PersonElement';
import { getPerson } from '@/lib/optimizely/get-person';
import { LinkedInIcon } from '@/components/ui';
import Image from 'next/image';

type Props = {
  content: ContentProps<typeof PersonElementCT>;
};

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
        {person.linkedIn?.default && (
          <a
            href={person.linkedIn.default}
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
