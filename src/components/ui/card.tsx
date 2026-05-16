import { cn } from '@/lib/utils';

type DivProps = React.HTMLAttributes<HTMLDivElement>;

export function Card({ className, ...props }: DivProps) {
  return (
    <div
      className={cn(
        'bg-card text-card-foreground rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300',
        className
      )}
      {...props}
    />
  );
}

export function CardMedia({ className, ...props }: DivProps) {
  return <div className={cn('relative h-48 w-full', className)} {...props} />;
}

export function CardBody({ className, ...props }: DivProps) {
  return <div className={cn('p-6', className)} {...props} />;
}
