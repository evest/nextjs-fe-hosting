import { ContentProps } from '@optimizely/cms-sdk';
import { getPreviewUtils } from '@optimizely/cms-sdk/react/server';
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Cog,
  Compass,
  Hammer,
  Lightbulb,
  Rocket,
  Search,
  Settings,
  Shield,
  Sparkles,
  Users,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import { ProcessBlockCT } from '@/content-types/ProcessBlock';
import { ProcessBlockDisplayTemplate } from '@/display-templates/ProcessBlockDisplayTemplate';
import { Container } from '@/components/ui';
import { cn } from '@/lib/utils';

type Props = {
  content: ContentProps<typeof ProcessBlockCT>;
  displaySettings?: ContentProps<typeof ProcessBlockDisplayTemplate>;
};

const surfaceClass = {
  light: 'bg-background text-foreground',
  muted: 'section-muted bg-background text-foreground',
  dark: 'section-dark bg-background text-foreground',
};

// Static allowlist so tree-shaking keeps only the imports below.
const iconMap: Record<string, LucideIcon> = {
  activity: Activity,
  check: CheckCircle2,
  cog: Cog,
  compass: Compass,
  hammer: Hammer,
  lightbulb: Lightbulb,
  rocket: Rocket,
  search: Search,
  settings: Settings,
  shield: Shield,
  sparkles: Sparkles,
  users: Users,
  wrench: Wrench,
};

export default function ProcessBlock({ content, displaySettings }: Props) {
  const { pa } = getPreviewUtils(content);
  const surface = (displaySettings?.surface ?? 'light') as keyof typeof surfaceClass;
  const layout = displaySettings?.layout ?? 'horizontal';

  const steps = [
    { key: 1 as const, title: content.step1Title, description: content.step1Description, icon: content.step1Icon },
    { key: 2 as const, title: content.step2Title, description: content.step2Description, icon: content.step2Icon },
    { key: 3 as const, title: content.step3Title, description: content.step3Description, icon: content.step3Icon },
    { key: 4 as const, title: content.step4Title, description: content.step4Description, icon: content.step4Icon },
  ].filter((s) => s.title || s.description);

  const isHorizontal = layout === 'horizontal';
  const gridClass = isHorizontal
    ? steps.length === 4
      ? 'grid gap-8 md:grid-cols-2 lg:grid-cols-4'
      : steps.length === 3
        ? 'grid gap-8 md:grid-cols-3'
        : steps.length === 2
          ? 'grid gap-8 md:grid-cols-2'
          : 'grid gap-8'
    : 'flex flex-col gap-8 max-w-3xl';

  return (
    <section className={cn(surfaceClass[surface], 'py-16 md:py-24')}>
      <Container>
        {(content.heading || content.subheading) && (
          <div className="max-w-3xl mb-12 md:mb-16">
            {content.heading && (
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight" {...pa('heading')}>
                {content.heading}
              </h2>
            )}
            {content.subheading && (
              <p className="mt-4 text-lg text-muted-foreground" {...pa('subheading')}>
                {content.subheading}
              </p>
            )}
          </div>
        )}

        <ol className={gridClass}>
          {steps.map((step, index) => {
            const Icon = iconMap[(step.icon ?? '').toLowerCase()];
            const isLast = index === steps.length - 1;
            return (
              <li key={step.key} className={cn('relative', !isHorizontal && 'flex gap-6')}>
                {isHorizontal ? (
                  <div className="relative">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="flex items-center justify-center w-12 h-12 bg-accent text-accent-foreground font-bold text-lg rounded-md flex-shrink-0">
                        {step.key}
                      </div>
                      {Icon && <Icon className="w-7 h-7 text-accent" strokeWidth={1.5} aria-hidden />}
                    </div>
                    {step.title && (
                      <h3 className="text-xl font-semibold mb-2" {...pa(`step${step.key}Title`)}>
                        {step.title}
                      </h3>
                    )}
                    {step.description && (
                      <p className="text-base text-muted-foreground" {...pa(`step${step.key}Description`)}>
                        {step.description}
                      </p>
                    )}
                    {!isLast && (
                      <ArrowRight className="hidden lg:block absolute top-3 -right-6 w-6 h-6 opacity-30" aria-hidden />
                    )}
                  </div>
                ) : (
                  <>
                    <div className="flex flex-col items-center flex-shrink-0">
                      <div className="flex items-center justify-center w-12 h-12 bg-accent text-accent-foreground font-bold text-lg rounded-md">
                        {step.key}
                      </div>
                      {!isLast && <div className="w-px flex-1 bg-border mt-2" />}
                    </div>
                    <div className="pb-8 flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {Icon && <Icon className="w-6 h-6 text-accent" strokeWidth={1.5} aria-hidden />}
                        {step.title && (
                          <h3 className="text-xl font-semibold" {...pa(`step${step.key}Title`)}>
                            {step.title}
                          </h3>
                        )}
                      </div>
                      {step.description && (
                        <p className="text-base text-muted-foreground" {...pa(`step${step.key}Description`)}>
                          {step.description}
                        </p>
                      )}
                    </div>
                  </>
                )}
              </li>
            );
          })}
        </ol>
      </Container>
    </section>
  );
}
