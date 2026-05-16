import { forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

export const buttonVariants = cva(
  'inline-flex items-center justify-center font-semibold transition-opacity hover:opacity-90 disabled:opacity-50',
  {
    variants: {
      variant: {
        button: 'rounded-lg px-6 py-3',
        link: 'underline underline-offset-4 hover:opacity-80',
      },
      tone: {
        light: '',
        dark: '',
      },
    },
    compoundVariants: [
      { variant: 'button', tone: 'light', class: 'bg-primary-foreground text-primary' },
      { variant: 'button', tone: 'dark', class: 'bg-primary text-primary-foreground' },
      { variant: 'link', tone: 'light', class: 'text-primary-foreground' },
      { variant: 'link', tone: 'dark', class: 'text-primary' },
    ],
    defaultVariants: {
      variant: 'button',
      tone: 'dark',
    },
  }
);

export type ButtonVariantProps = VariantProps<typeof buttonVariants>;

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & ButtonVariantProps;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, tone, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, tone }), className)}
      {...props}
    />
  )
);
Button.displayName = 'Button';
