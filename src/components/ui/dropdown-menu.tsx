'use client';

import { DropdownMenu as Primitive } from 'radix-ui';
import type { ComponentProps } from 'react';

import { cn } from '@/utils/cn';

export const DropdownMenu = Primitive.Root;
export const DropdownMenuTrigger = Primitive.Trigger;
export const DropdownMenuGroup = Primitive.Group;

export function DropdownMenuContent({ className, sideOffset = 6, ...props }: ComponentProps<typeof Primitive.Content>) {
  return (
    <Primitive.Portal>
      <Primitive.Content
        sideOffset={sideOffset}
        className={cn(
          'z-50 min-w-44 animate-fade-in rounded-lg border border-rule bg-white p-1 shadow-raise focus:outline-none',
          className,
        )}
        {...props}
      />
    </Primitive.Portal>
  );
}

export function DropdownMenuItem({
  className,
  tone = 'default',
  ...props
}: ComponentProps<typeof Primitive.Item> & { tone?: 'default' | 'danger' }) {
  return (
    <Primitive.Item
      className={cn(
        'flex cursor-default items-center gap-2 rounded-md px-2.5 py-1.5 text-sm outline-none select-none data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0',
        tone === 'danger'
          ? 'text-danger-700 data-highlighted:bg-danger-50'
          : 'text-navy-900 data-highlighted:bg-navy-50',
        className,
      )}
      {...props}
    />
  );
}

export function DropdownMenuSeparator({ className, ...props }: ComponentProps<typeof Primitive.Separator>) {
  return <Primitive.Separator className={cn('my-1 h-px bg-rule', className)} {...props} />;
}

export function DropdownMenuLabel({ className, ...props }: ComponentProps<typeof Primitive.Label>) {
  return <Primitive.Label className={cn('px-2.5 py-1.5 text-xs font-medium text-muted', className)} {...props} />;
}
