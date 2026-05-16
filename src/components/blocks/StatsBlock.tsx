import { ContentProps } from '@optimizely/cms-sdk';
import { getPreviewUtils } from '@optimizely/cms-sdk/react/server';
import { StatsBlockCT } from '@/content-types/StatsBlock';
import { StatsBlockDisplayTemplate } from '@/display-templates/StatsBlockDisplayTemplate';
import { Container } from '@/components/ui';
import { cn } from '@/lib/utils';

type Props = {
  content: ContentProps<typeof StatsBlockCT>;
  displaySettings?: ContentProps<typeof StatsBlockDisplayTemplate>;
};

const surfaceClass = {
  light: 'bg-background text-foreground',
  muted: 'section-muted bg-background text-foreground',
  dark: 'section-dark bg-background text-foreground',
};

export default function StatsBlock({ content, displaySettings }: Props) {
  const { pa } = getPreviewUtils(content);
  const surface = (displaySettings?.surface ?? 'light') as keyof typeof surfaceClass;

  const stats = [
    { value: content.stat1Value, label: content.stat1Label, key: 'stat1' as const },
    { value: content.stat2Value, label: content.stat2Label, key: 'stat2' as const },
    { value: content.stat3Value, label: content.stat3Label, key: 'stat3' as const },
    { value: content.stat4Value, label: content.stat4Label, key: 'stat4' as const },
  ].filter((s) => s.value || s.label);

  return (
    <section className={cn(surfaceClass[surface], 'py-16 md:py-24')}>
      <Container>
        {content.heading && (
          <h2 className="text-2xl md:text-4xl font-bold mb-12 max-w-3xl" {...pa('heading')}>
            {content.heading}
          </h2>
        )}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-4">
          {stats.map((s) => (
            <div key={s.key}>
              <div
                className="text-5xl md:text-6xl font-bold tracking-tight leading-none text-highlight"
                {...pa(`${s.key}Value`)}
              >
                {s.value || '—'}
              </div>
              <div
                className="mt-3 text-sm md:text-base uppercase tracking-wider text-muted-foreground"
                {...pa(`${s.key}Label`)}
              >
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
