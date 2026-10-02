import Link from 'next/link';
import type { ReactNode } from 'react';

import { cn } from '@/utils/cn';

interface SectionHeaderProps {
  id: string;
  title: string;
  description?: ReactNode;
  action?: { href: string; label: string };
  className?: string;
}

export function SectionHeader({ id, title, description, action, className }: SectionHeaderProps) {
  return (
    <div className={cn('flex flex-wrap items-end justify-between gap-x-8 gap-y-3', className)}>
      <div className="max-w-2xl">
        <h2 id={id} className="text-2xl font-semibold tracking-tight text-ink sm:text-[1.75rem]">
          {title}
        </h2>
        {description ? <p className="mt-2 leading-relaxed text-muted">{description}</p> : null}
      </div>
      {action ? (
        <Link href={action.href} className="text-sm font-medium text-azure-700 hover:underline">
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}

export function PageHeader({ title, description, children }: { title: string; description?: ReactNode; children?: ReactNode }) {
  return (
    <header className="border-b border-rule pt-12 pb-10 sm:pt-16">
      <h1 className="display-condensed text-5xl leading-none font-semibold tracking-[-0.015em] text-ink sm:text-6xl">{title}</h1>
      {description ? <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted">{description}</p> : null}
      {children}
    </header>
  );
}
