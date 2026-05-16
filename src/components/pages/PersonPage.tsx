import { ContentProps, damAssets } from '@optimizely/cms-sdk';
import { RichText } from '@optimizely/cms-sdk/react/richText';
import { getPreviewUtils } from '@optimizely/cms-sdk/react/server';
import { PersonPageCT } from '@/content-types/PersonPage';
import {
  Container,
  Heading,
  Prose,
  XIcon,
  TikTokIcon,
  LinkedInIcon,
  FacebookIcon,
  InstagramIcon,
  YouTubeIcon,
} from '@/components/ui';
import Image from 'next/image';

type Props = {
  content: ContentProps<typeof PersonPageCT>;
};

type UrlValue = ContentProps<typeof PersonPageCT>['linkedIn'];

export default function PersonPage({ content }: Props) {
  const { pa, src } = getPreviewUtils(content);
  const { getAlt } = damAssets(content);

  const allSocials: Array<{ url: UrlValue | null; label: string; icon: React.ReactElement }> = [
    { url: content.linkedIn, label: 'LinkedIn', icon: <LinkedInIcon className="w-5 h-5" /> },
    { url: content.xtwitter, label: 'X', icon: <XIcon className="w-5 h-5" /> },
    { url: content.facebook, label: 'Facebook', icon: <FacebookIcon className="w-5 h-5" /> },
    { url: content.instagram, label: 'Instagram', icon: <InstagramIcon className="w-5 h-5" /> },
    { url: content.youTube, label: 'YouTube', icon: <YouTubeIcon className="w-5 h-5" /> },
    { url: content.tikTok, label: 'TikTok', icon: <TikTokIcon className="w-5 h-5" /> },
  ];

  const socialLinks = allSocials.filter((link) => link.url);

  return (
    <Container size="narrow" className="py-12">
      <article>
        <div className="flex flex-col md:flex-row gap-8 md:gap-12 items-start">
          {src(content.image) && (
            <div className="shrink-0 mx-auto md:mx-0">
              <div className="relative w-48 h-48 md:w-64 md:h-64 rounded-full overflow-hidden ring-4 ring-border shadow-lg">
                <Image
                  src={src(content.image)!}
                  alt={getAlt(content.image, content.name ?? 'Profile photo')}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 192px, 256px"
                  priority
                  {...pa('image')}
                />
              </div>
            </div>
          )}

          <div className="flex-1 text-center md:text-left">
            <Heading level="h1" className="text-3xl md:text-4xl mb-2" {...pa('name')}>
              {content.name}
            </Heading>

            {content.title && (
              <p className="text-lg md:text-xl text-muted-foreground mb-6" {...pa('title')}>
                {content.title}
              </p>
            )}

            {socialLinks.length > 0 && (
              <div className="flex gap-3 justify-center md:justify-start">
                {socialLinks.map((link) => (
                  <a
                    key={link.label}
                    href={String(link.url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={link.label}
                    className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-secondary text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-colors duration-200"
                  >
                    {link.icon}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>

        {content.bio && (
          <Prose className="mt-10" {...pa('bio')}>
            <RichText content={content.bio?.json} />
          </Prose>
        )}
      </article>
    </Container>
  );
}
