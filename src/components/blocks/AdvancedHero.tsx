import { ContentProps } from '@optimizely/cms-sdk';
import { getPreviewUtils } from '@optimizely/cms-sdk/react/server';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { AdvancedHeroCT } from '@/content-types/AdvancedHero';
import { Container } from '@/components/ui';

type Props = {
  content: ContentProps<typeof AdvancedHeroCT>;
};

// Splits a headline on *...* segments and renders the wrapped text in an
// italic brand colour. "Unlock your *content* potential" brands "content".
function renderHeadline(text: string | null | undefined) {
  return (text ?? '').split(/\*([^*]+)\*/g).map((part, i) =>
    i % 2 === 1 ? (
      <em key={i} className="italic text-brand">
        {part}
      </em>
    ) : (
      part
    ),
  );
}

export default function AdvancedHero({ content }: Props) {
  const t = useTranslations('Cta');
  const { pa } = getPreviewUtils(content);

  const names = (content.trustedByNames ?? []).filter(Boolean);
  const hasPrimary = !!content.primaryCta?.url?.default;
  const hasSecondary = !!content.secondaryCta?.url?.default;
  const hasTrusted = !!content.trustedByLabel || names.length > 0;
  const hasBottomRow = !!content.bodyText || hasPrimary || hasSecondary || hasTrusted;

  return (
    <section className="w-full font-body text-foreground">
      <Container className="py-16 md:py-24">
        {content.eyebrow && (
          <div className="mb-8 flex items-center gap-3">
            <span aria-hidden className="h-px w-7 bg-foreground/40" />
            <span
              className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground"
              {...pa('eyebrow')}
            >
              {content.eyebrow}
            </span>
          </div>
        )}

        <h1
          className="max-w-6xl font-display text-[2.75rem] font-normal leading-[0.95] tracking-[-0.025em] text-pretty sm:text-6xl md:text-7xl lg:text-[7rem] xl:text-[8.25rem]"
          {...pa('headline')}
        >
          {renderHeadline(content.headline)}
        </h1>

        {hasBottomRow && (
          <div className="mt-12 grid gap-10 border-t border-border pt-8 md:mt-16 lg:grid-cols-[1.1fr_1fr_0.9fr] lg:gap-14">
            {content.bodyText && (
              <p
                className="max-w-md text-[17px] leading-relaxed text-foreground/80"
                {...pa('bodyText')}
              >
                {content.bodyText}
              </p>
            )}

            {(hasPrimary || hasSecondary) && (
              <div className="flex flex-col items-start gap-3">
                {hasPrimary && (
                  <Link
                    href={content.primaryCta!.url!.default!}
                    target={content.primaryCta!.target ?? undefined}
                    className="inline-flex items-center gap-2.5 rounded-full bg-foreground px-6 py-3.5 text-[15px] font-semibold text-background transition-opacity hover:opacity-90"
                    {...pa('primaryCta')}
                  >
                    {content.primaryCta!.text || t('learnMore')}
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </Link>
                )}
                {hasSecondary && (
                  <Link
                    href={content.secondaryCta!.url!.default!}
                    target={content.secondaryCta!.target ?? undefined}
                    className="py-2 text-[15px] font-semibold underline underline-offset-4 transition-opacity hover:opacity-70"
                    {...pa('secondaryCta')}
                  >
                    {content.secondaryCta!.text || t('contactUs')}
                  </Link>
                )}
              </div>
            )}

            {hasTrusted && (
              <div>
                {content.trustedByLabel && (
                  <div
                    className="mb-3.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground"
                    {...pa('trustedByLabel')}
                  >
                    {content.trustedByLabel}
                  </div>
                )}
                {names.length > 0 && (
                  <div
                    className="flex flex-wrap items-center gap-x-6 gap-y-3.5"
                    {...pa('trustedByNames')}
                  >
                    {names.map((name, i) => (
                      <span
                        key={i}
                        className="font-display text-[22px] leading-none text-muted-foreground"
                      >
                        {name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Container>
    </section>
  );
}
