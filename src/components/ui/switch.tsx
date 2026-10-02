'use client';

import { Switch as Primitive } from 'radix-ui';
import type { ComponentProps } from 'react';

import { cn } from '@/utils/cn';

export function Switch({ className, ...props }: ComponentProps<typeof Primitive.Root>) {
  return (
    <Primitive.Root
      className={cn(
        'inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border border-transparent bg-rule-strong transition-colors data-[state=checked]:bg-teal-600 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <Primitive.Thumb className="block size-4 translate-x-0.5 rounded-full bg-white shadow-sm transition-transform data-[state=checked]:translate-x-4" />
    </Primitive.Root>
  );
}
