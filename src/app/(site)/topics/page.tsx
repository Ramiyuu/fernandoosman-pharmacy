import type { Metadata } from 'next';
import Link from 'next/link';

import { Container } from '@/components/layout/container';
import { PageHeader } from '@/components/layout/section-header';
import { TopicIcon } from '@/components/icons/topic-icon';
import { TopicPlot } from '@/features/topics/components/topic-plot';
import { buildMetadata } from '@/lib/seo/metadata';
import { getPublicMetrics, getTopicsWithCounts } from '@/services/public-content.service';

export const revalidate = 300;

const DESCRIPTION = 'Browse articles by subject area: clinical research, biostatistics, pharmacology and more.';

export const metadata: Metadata = buildMetadata({ title: 'Topics', description: DESCRIPTION, path: '/topics' });

export default async function TopicsPage() {
  const [topics, metrics] = await Promise.all([getTopicsWithCounts(), getPublicMetrics()]);

  return (
    <Container>
      <PageHeader title="Topics" description={DESCRIPTION} />
      {topics.length === 0 ? (
        <p className="mt-10 text-muted">Topics will appear here once they are created.</p>
      ) : (
        <>
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {topics.map((topic) => (
              <li key={topic.slug} className="group relative rounded-xl border border-rule p-5 transition-colors hover:border-rule-strong">
                <div className="flex items-start justify-between gap-4">
                  <span className="inline-flex size-10 items-center justify-center rounded-lg bg-teal-50">
                    <TopicIcon name={topic.icon} className="size-5 text-teal-700" />
                  </span>
                  <span className="text-sm text-muted tabular">
                    {topic.article_count} {topic.article_count === 1 ? 'article' : 'articles'}
                  </span>
                </div>
                <h2 className="mt-4 text-lg font-semibold text-ink">
                  <Link href={`/topics/${topic.slug}`} className="after:absolute after:inset-0 group-hover:underline group-hover:decoration-teal-500 group-hover:underline-offset-4">
                    {topic.name}
                  </Link>
                </h2>
                <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-muted">{topic.description}</p>
              </li>
            ))}
          </ul>
          <section aria-label="Distribution of articles across topics" className="mt-16">
            <TopicPlot topics={topics} totalArticles={metrics.articles_published} />
          </section>
        </>
      )}
    </Container>
  );
}
