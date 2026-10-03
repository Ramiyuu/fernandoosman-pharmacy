import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';

import { getI18n } from '@/i18n/server';
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
 * The rules draw in and the figures settle as the table scrolls into view.
 */
export async function MetricsTable({ metrics }: { metrics: PublicMetrics }) {
  const { locale, t, href } = await getI18n();
  const m = t.metrics;
  const n = (value: number) => formatNumber(value, locale);
  const items: Metric[] = [
    { label: m.articles, value: n(metrics.articles_published) },
    ...(metrics.paper_reviews > 0 ? [{ label: m.paperReviews, value: n(metrics.paper_reviews) }] : []),
    ...(metrics.research_notes > 0 ? [{ label: m.researchNotes, value: n(metrics.research_notes) }] : []),
    { label: m.topics, value: n(metrics.topics_covered) },
    { label: m.projects, value: n(metrics.data_projects) },
    { label: m.references, value: n(metrics.references_reviewed) },
    ...(metrics.current_semester
      ? [
          {
            label: m.semester,
            value: metrics.total_semesters
              ? `${metrics.current_semester}/${metrics.total_semesters}`
              : String(metrics.current_semester),
          },
        ]
      : []),
  ];

  const latest = metrics.latest_publication;

  return (
    <figure aria-labelledby="metrics-caption" className="metrics-table">
      <figcaption id="metrics-caption" className="mb-3 text-sm text-muted">
        <span className="font-semibold text-ink">{m.caption}</span> · {m.note}
      </figcaption>
      <dl className="metrics-grid grid grid-cols-2 gap-x-6 gap-y-6 rounded-xl border border-rule bg-white p-6 shadow-raise sm:grid-cols-3 lg:auto-cols-fr lg:grid-flow-col lg:grid-cols-none">
        {items.map((item, index) => (
          <div key={item.label} className="metric flex flex-col-reverse" style={{ '--i': index } as CSSProperties}>
            <dt className="mt-1 text-sm text-muted">{item.label}</dt>
            <dd className="text-3xl font-medium tracking-tight text-ink tabular sm:text-4xl">{item.value}</dd>
          </div>
        ))}
      </dl>
      {latest ? (
        <p className="mt-3 text-sm text-muted">
          {m.latest}{' '}
          <Link href={href(`/articles/${latest.slug}`)} className="font-medium text-azure-700 hover:underline">
            {latest.title}
          </Link>{' '}
          (<time dateTime={toIsoDate(latest.published_at)}>{formatDate(latest.published_at, locale)}</time>)
        </p>
      ) : null}
    </figure>
  );
}
