import { ContentProps } from '@optimizely/cms-sdk';
import { getPreviewUtils } from '@optimizely/cms-sdk/react/server';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
  ArrowRight,
  Activity,
  Box,
  Cloud,
  Compass,
  Cpu,
  Gauge,
  Layers,
  Lightbulb,
  Network,
  Rocket,
  Settings,
  Shield,
  Sparkles,
  Target,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import { SolutionTileCT } from '@/content-types/SolutionTile';
import { cn } from '@/lib/utils';

type Props = {
  content: ContentProps<typeof SolutionTileCT>;
};

const iconMap: Record<string, LucideIcon> = {
  activity: Activity,
  box: Box,
  cloud: Cloud,
  compass: Compass,
  cpu: Cpu,
  gauge: Gauge,
  layers: Layers,
  lightbulb: Lightbulb,
  network: Network,
  rocket: Rocket,
  settings: Settings,
  shield: Shield,
  sparkles: Sparkles,
  target: Target,
  wrench: Wrench,
};

export default function SolutionTile({ content }: Props) {
  const t = useTranslations('Cta');
  const { pa } = getPreviewUtils(content);
  const href = content.link?.url?.default;
  const Icon = iconMap[(content.iconName ?? '').toLowerCase()] ?? Box;

  const inner = (
    <>
      <div className="mb-6">
        <Icon className="w-10 h-10 text-foreground" strokeWidth={1.5} aria-hidden />
      </div>
      <h3 className="text-xl font-semibold mb-2" {...pa('name')}>
        {content.name}
      </h3>
      {content.tagline && (
        <p className="text-sm text-muted-foreground" {...pa('tagline')}>
          {content.tagline}
        </p>
      )}
      {href && (
        <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-accent group-hover:gap-3 transition-all">
          {t('learnMore')} <ArrowRight className="w-4 h-4" aria-hidden />
        </span>
      )}
    </>
  );

  const baseClass = cn(
    "group relative block h-full bg-card text-card-foreground p-8 border border-border rounded-lg",
    "before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-accent before:rounded-l-lg",
    'hover:border-foreground/40 transition-colors'
  );

  if (href) {
    return (
      <Link href={href} target={content.link?.target ?? undefined} className={baseClass} {...pa('link')}>
        {inner}
      </Link>
    );
  }
  return <div className={baseClass}>{inner}</div>;
}
