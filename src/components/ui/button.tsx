import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';
import type { ComponentProps } from 'react';

import { cn } from '@/utils/cn';

export const buttonVariants = cva(
  'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=size-])]:size-4',
  {
    variants: {
      variant: {
        primary: 'bg-azure-600 text-white hover:bg-azure-700 active:bg-azure-800',
        dark: 'bg-navy-900 text-white hover:bg-navy-800',
        secondary: 'border border-rule-strong bg-white text-ink hover:border-navy-700 hover:bg-navy-50',
        ghost: 'text-navy-800 hover:bg-navy-50',
        danger: 'bg-danger-700 text-white hover:bg-danger-600',
        'danger-ghost': 'text-danger-700 hover:bg-danger-50',
        link: 'h-auto px-0 text-azure-700 underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-8 rounded-md px-3 text-sm',
        md: 'h-10 rounded-md px-4 text-sm',
        lg: 'h-12 rounded-md px-5 text-base',
        icon: 'size-9 rounded-md',
        'icon-sm': 'size-8 rounded-md',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export type ButtonProps = ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

export function Button({ className, variant, size, asChild = false, type, ...props }: ButtonProps) {
  const Component = asChild ? Slot.Root : 'button';
  return (
    <Component
      className={cn(buttonVariants({ variant, size }), className)}
      {...(asChild ? {} : { type: type ?? 'button' })}
      {...props}
    />
  );
}
