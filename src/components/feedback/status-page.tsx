import type { ReactNode } from 'react';

interface StatusPageProps {
  code: string;
  title: string;
  description: ReactNode;
  actions: ReactNode;
}

/** Shared layout for 403/404/500 pages (also used by client error boundaries). */
export function StatusPage({ code, title, description, actions }: StatusPageProps) {
  return (
    <div className="page-gutter mx-auto flex min-h-[60vh] max-w-2xl flex-col justify-center py-20">
      <p className="display-title text-7xl text-teal-500 tabular">{code}</p>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight text-ink">{title}</h1>
      <div className="mt-3 text-lg leading-relaxed text-muted">{description}</div>
      <div className="mt-8 flex flex-wrap gap-3">{actions}</div>
    </div>
  );
}
