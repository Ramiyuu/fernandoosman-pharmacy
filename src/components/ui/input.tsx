import type { ComponentProps } from 'react';

import { cn } from '@/utils/cn';

const fieldBase =
  'w-full rounded-md border border-rule-strong bg-white text-sm text-ink placeholder:text-subtle transition-colors focus-visible:border-teal-500 focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-teal-500/40 disabled:cursor-not-allowed disabled:bg-mist aria-invalid:border-danger-700';

export function Input({ className, type = 'text', ...props }: ComponentProps<'input'>) {
  return <input type={type} className={cn(fieldBase, 'h-10 px-3', className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return <textarea className={cn(fieldBase, 'min-h-24 px-3 py-2 leading-relaxed', className)} {...props} />;
}

export function NativeSelect({ className, children, ...props }: ComponentProps<'select'>) {
  return (
    <select className={cn(fieldBase, 'h-10 appearance-none bg-[length:16px] bg-[right_0.6rem_center] bg-no-repeat pr-9 pl-3', className)}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23566170' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
      }}
      {...props}
    >
      {children}
    </select>
  );
}

export function Label({ className, ...props }: ComponentProps<'label'>) {
  return <label className={cn('text-sm font-medium text-navy-900', className)} {...props} />;
}
