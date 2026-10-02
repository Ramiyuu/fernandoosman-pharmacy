import type { ReactNode } from 'react';

import { Badge } from '@/components/ui/badge';
import type { ContentStatus } from '@/types/database.types';
import { cn } from '@/utils/cn';

export function AdminPage({
  title,
  description,
  actions,
  children,
  wide = false,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={cn('mx-auto w-full px-4 py-8 sm:px-6 lg:px-10', wide ? 'max-w-[90rem]' : 'max-w-6xl')}>
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">{title}</h1>
          {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </header>
      {children}
    </div>
  );
}

export function Panel({
  title,
  description,
  actions,
  children,
  className,
}: {
  title?: string;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('min-w-0 rounded-xl border border-rule bg-white', className)}>
      {title ? (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-rule px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-ink">{title}</h2>
            {description ? <p className="mt-0.5 text-sm text-muted">{description}</p> : null}
          </div>
          {actions}
        </header>
      ) : null}
      <div className="p-5">{children}</div>
    </section>
  );
}

const STATUS_TONE: Record<ContentStatus, 'success' | 'warning' | 'neutral'> = {
  published: 'success',
  draft: 'warning',
  archived: 'neutral',
};

export const STATUS_LABEL: Record<ContentStatus, string> = {
  published: 'Published',
  draft: 'Draft',
  archived: 'Archived',
};

export function StatusBadge({ status }: { status: ContentStatus }) {
  return <Badge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Badge>;
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-rule-strong bg-white px-6 py-12 text-center">
      <p className="font-medium text-ink">{title}</p>
      {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}

export const tableClasses = {
  wrapper: 'relative overflow-x-auto rounded-xl border border-rule bg-white',
  table: 'w-full min-w-[40rem] text-left text-sm',
  head: 'border-b border-rule bg-mist text-xs font-medium text-muted',
  th: 'px-4 py-3 font-medium',
  row: 'border-b border-rule last:border-b-0 hover:bg-navy-50/50',
  td: 'px-4 py-3 align-middle',
};
