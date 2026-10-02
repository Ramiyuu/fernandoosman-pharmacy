import type { ReactNode } from 'react';

import { cn } from '@/utils/cn';

import { Label } from './input';

interface FieldProps {
  id: string;
  label: string;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  className?: string;
  /** Rendered after the label, e.g. a character counter. */
  aside?: ReactNode;
  children: ReactNode;
}

/**
 * Label + control + hint/error, wired for screen readers. The control should
 * set aria-describedby={`${id}-description`} and aria-invalid when `error` is set.
 */
export function Field({ id, label, hint, error, required, className, aside, children }: FieldProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <div className="flex items-baseline justify-between gap-3">
        <Label htmlFor={id}>
          {label}
          {required ? (
            <span className="text-danger-700" aria-hidden="true">
              {' '}*
            </span>
          ) : null}
        </Label>
        {aside}
      </div>
      {children}
      {error ? (
        <p id={`${id}-description`} role="alert" className="text-sm text-danger-700">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-description`} className="text-sm text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function describedBy(id: string, hasDescription: boolean): string | undefined {
  return hasDescription ? `${id}-description` : undefined;
}
