import { cn } from '@/lib/utils';

type ProseProps = React.HTMLAttributes<HTMLDivElement> & {
  size?: 'sm' | 'base' | 'lg';
};

const sizeClass: Record<NonNullable<ProseProps['size']>, string> = {
  sm: 'prose prose-sm',
  base: 'prose',
  lg: 'prose prose-lg',
};

export function Prose({ size = 'lg', className, ...props }: ProseProps) {
  return <div className={cn(sizeClass[size], 'max-w-none', className)} {...props} />;
}
