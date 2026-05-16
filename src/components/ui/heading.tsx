import { createElement } from 'react';
import { cn } from '@/lib/utils';

const HEADING_STYLE = {
  h1: 'text-4xl font-bold text-foreground',
  h2: 'text-3xl font-bold text-foreground',
  h3: 'text-2xl font-semibold text-foreground',
  h4: 'text-xl font-semibold text-muted-foreground',
  h5: 'text-lg font-medium text-muted-foreground',
  h6: 'text-base font-medium text-muted-foreground',
  plain: 'text-base text-muted-foreground',
} as const;

const TAG: Record<keyof typeof HEADING_STYLE, keyof React.JSX.IntrinsicElements> = {
  h1: 'h1',
  h2: 'h2',
  h3: 'h3',
  h4: 'h4',
  h5: 'h5',
  h6: 'h6',
  plain: 'p',
};

type Level = keyof typeof HEADING_STYLE;

type HeadingProps = React.HTMLAttributes<HTMLElement> & {
  level?: Level;
  as?: Level;
};

export function Heading({ level = 'h2', as, className, ...props }: HeadingProps) {
  const tag = TAG[as ?? level];
  return createElement(tag, { className: cn(HEADING_STYLE[level], className), ...props });
}
