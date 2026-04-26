import { ContentProps, GraphClient, damAssets } from '@optimizely/cms-sdk';
import { getPreviewUtils } from '@optimizely/cms-sdk/react/server';
import { PersonElementCT } from '@/content-types/PersonElement';
import { PersonPageCT } from '@/content-types/PersonPage';
import { getGraphGatewayUrl } from '@/lib/config';
import Image from 'next/image';

type Props = {
  content: ContentProps<typeof PersonElementCT>;
};

type PersonData = ContentProps<typeof PersonPageCT>;

async function getPerson(path: string, host?: string): Promise<PersonData | null> {
  console.log('[PersonElement] Fetching person from Graph:', { path, host });
  const client = new GraphClient(process.env.OPTIMIZELY_GRAPH_SINGLE_KEY!, {
    graphUrl: getGraphGatewayUrl(),
  });
  const results = await client.getContentByPath(path, { host: host ?? undefined });
  console.log('[PersonElement] Graph results:', JSON.stringify(results, null, 2));
  return results?.[0] ?? null;
}

export default async function PersonElement({ content }: Props) {
  console.log('[PersonElement] Input content:', JSON.stringify(content, null, 2));
  console.log('[PersonElement] Person reference:', JSON.stringify(content.person, null, 2));

  const { pa } = getPreviewUtils(content);

  const personPath = content.person?.url?.default;
  const personHost = content.person?.url?.base;
  console.log('[PersonElement] Resolved path:', personPath, 'host:', personHost);
  if (!personPath) {
    console.log('[PersonElement] No personPath — returning null');
    return null;
  }

  const person = await getPerson(String(personPath), personHost ? String(personHost) : undefined);
  if (!person) {
    console.log('[PersonElement] No person data returned — returning null');
    return null;
  }

  const { src } = getPreviewUtils(person);
  const { getAlt } = damAssets(person);
  const imageUrl = src(person.image);
  console.log('[PersonElement] Resolved imageUrl:', imageUrl);

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
        <p className="font-semibold text-foreground truncate">
          {person.name}
        </p>
        {person.title && (
          <p className="text-sm text-muted-foreground truncate">
            {person.title}
          </p>
        )}
        {person.linkedIn && (
          <a
            href={String(person.linkedIn)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mt-1"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
            </svg>
            LinkedIn
          </a>
        )}
      </div>
    </div>
  );
}
