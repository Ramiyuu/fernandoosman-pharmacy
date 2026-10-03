import Link from 'next/link';
import type { CSSProperties } from 'react';

import { TopicIcon } from '@/components/icons/topic-icon';
import { getI18n } from '@/i18n/server';
import type { TopicWithCount } from '@/types/content';

/**
 * Topics drawn in the visual language of a forest plot: one row per topic, a
 * square marker whose size and position encode the topic's share of published
 * articles, and a light reference grid. The numbers (n, %) are always printed
 * so nothing depends on reading the graphic.
 */
export async function TopicPlot({ topics, totalArticles }: { topics: TopicWithCount[]; totalArticles: number }) {
  const { t, href } = await getI18n();
  const copy = t.topics.plot;
  const maxCount = Math.max(1, ...topics.map((topic) => topic.article_count));
  const ticks = [0, 25, 50, 75, 100];

  return (
    <figure aria-labelledby="topic-plot-caption" className="topic-plot">
      <div role="table" aria-label={copy.table} className="text-sm">
        <div role="rowgroup">
          <div role="row" className="grid grid-cols-[minmax(0,1fr)_3rem] gap-x-4 border-b-2 border-navy-900 pb-2 font-medium text-ink md:grid-cols-[minmax(0,1.1fr)_3rem_minmax(0,1fr)]">
            <span role="columnheader">{copy.topic}</span>
            <span role="columnheader" className="text-right">
              {copy.n}
            </span>
            <span role="columnheader" className="hidden md:block">
              {copy.share}
            </span>
          </div>
        </div>
        <div role="rowgroup">
          {topics.map((topic, index) => {
            const share = totalArticles > 0 ? (topic.article_count / totalArticles) * 100 : 0;
            const size = 8 + (topic.article_count / maxCount) * 10;
            return (
              <div
                role="row"
                key={topic.slug}
                className="plot-row group relative grid grid-cols-[minmax(0,1fr)_3rem] items-center gap-x-4 border-b border-rule py-4 md:grid-cols-[minmax(0,1.1fr)_3rem_minmax(0,1fr)]"
                style={{ '--i': index } as CSSProperties}
              >
                <div role="cell" className="flex min-w-0 items-start gap-3">
                  <TopicIcon name={topic.icon} className="mt-0.5 size-4 shrink-0 text-teal-600" />
                  <div className="min-w-0">
                    <Link
                      href={href(`/topics/${topic.slug}`)}
                      className="font-medium text-ink after:absolute after:inset-0 group-hover:underline group-hover:decoration-teal-500 group-hover:underline-offset-4"
                    >
                      {topic.name}
                    </Link>
                    <p className="mt-0.5 line-clamp-2 text-muted">{topic.description}</p>
                  </div>
                </div>
                <div role="cell" className="text-right text-base font-semibold text-ink tabular">
                  {topic.article_count}
                </div>
                <div role="cell" className="relative hidden h-8 md:block" aria-label={copy.shareOf(Math.round(share))}>
                  {ticks.map((tick) => (
                    <span key={tick} className="absolute inset-y-0 w-px bg-rule" style={{ left: `${tick}%` }} aria-hidden="true" />
                  ))}
                  <span className="absolute inset-y-0 left-0 w-px bg-navy-700" aria-hidden="true" />
                  {topic.article_count > 0 ? (
                    <>
                      <span className="plot-whisker absolute top-1/2 left-0 h-px bg-navy-700" style={{ width: `${share}%` }} aria-hidden="true" />
                      <span
                        className="plot-marker absolute top-1/2 -translate-x-1/2 -translate-y-1/2 bg-teal-500"
                        style={{ left: `${share}%`, width: size, height: size }}
                        aria-hidden="true"
                      />
                    </>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="hidden grid-cols-[minmax(0,1.1fr)_3rem_minmax(0,1fr)] gap-x-4 pt-2 text-xs text-muted md:grid" aria-hidden="true">
        <span />
        <span />
        <div className="relative h-4 tabular">
          {ticks.map((tick) => (
            <span
              key={tick}
              className={tick === 0 ? 'absolute' : tick === 100 ? 'absolute -translate-x-full' : 'absolute -translate-x-1/2'}
              style={{ left: `${tick}%` }}
            >
              {tick}%
            </span>
          ))}
        </div>
      </div>
      <figcaption id="topic-plot-caption" className="mt-4 text-sm text-muted">
        <span className="font-semibold text-ink">{copy.figure}</span> {copy.caption}
      </figcaption>
    </figure>
  );
}
