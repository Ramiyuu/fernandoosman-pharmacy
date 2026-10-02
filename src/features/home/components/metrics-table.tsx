import Link from 'next/link';
import type { ReactNode } from 'react';

import type { PublicMetrics } from '@/types/content';
import { formatDate, formatNumber, toIsoDate } from '@/utils/format';

interface Metric {
  label: string;
  value: ReactNode;
}

/**
 * Site metrics laid out like "Table 1" of a paper (booktabs rules). Every
 * value comes from get_public_metrics(); metrics that are zero by nature of
 * the archive (e.g. no paper reviews yet) are omitted rather than shown as 0.
 */
export function MetricsTable({ metrics }: { metrics: PublicMetrics }) {
  const items: Metric[] = [
    { label: 'Articles published', value: formatNumber(metrics.articles_published) },
    ...(metrics.paper_reviews > 0 ? [{ label: 'Paper reviews', value: formatNumber(metrics.paper_reviews) }] : []),
    ...(metrics.research_notes > 0 ? [{ label: 'Research notes', value: formatNumber(metrics.research_notes) }] : []),
    { label: 'Topics covered', value: formatNumber(metrics.topics_covered) },
    { label: 'Data projects', value: formatNumber(metrics.data_projects) },
    { label: 'References reviewed', value: formatNumber(metrics.references_reviewed) },
    ...(metrics.current_semester
      ? [
          {
            label: 'Current semester',
            value: metrics.total_semesters ? `${metrics.current_semester}/${metrics.total_semesters}` : String(metrics.current_semester),
          },
        ]
      : []),
  ];

  const latest = metrics.latest_publication;

  return (
    <figure aria-labelledby="metrics-caption">
      <figcaption id="metrics-caption" className="mb-3 text-sm text-muted">
        <span className="font-semibold text-ink">Table 1.</span> The archive at a glance, counted live from published content.
      </figcaption>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-6 border-y-2 border-navy-900 py-6 sm:grid-cols-3 lg:grid-flow-col lg:auto-cols-fr lg:grid-cols-none">
        {items.map((item) => (
          <div key={item.label} className="flex flex-col-reverse">
            <dt className="mt-1 text-sm text-muted">{item.label}</dt>
            <dd className="text-3xl font-semibold tracking-tight text-ink tabular sm:text-4xl">{item.value}</dd>
          </div>
        ))}
      </dl>
      {latest ? (
        <p className="mt-3 text-sm text-muted">
          Latest publication:{' '}
          <Link href={`/articles/${latest.slug}`} className="font-medium text-azure-700 hover:underline">
            {latest.title}
          </Link>{' '}
          (<time dateTime={toIsoDate(latest.published_at)}>{formatDate(latest.published_at)}</time>)
        </p>
      ) : null}
    </figure>
  );
}
