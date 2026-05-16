import { cn } from '@/lib/utils';

type ContainerProps = React.HTMLAttributes<HTMLDivElement> & {
  size?: 'narrow' | 'default' | 'wide';
};

const sizeClass: Record<NonNullable<ContainerProps['size']>, string> = {
  narrow: 'max-w-4xl',
  default: 'max-w-7xl',
  wide: 'max-w-screen-2xl',
};

export function Container({ size = 'default', className, ...props }: ContainerProps) {
  return (
    <div
      className={cn('mx-auto w-full px-4 sm:px-6 lg:px-8', sizeClass[size], className)}
      {...props}
    />
  );
}
