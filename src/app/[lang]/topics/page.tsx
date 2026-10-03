import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Container } from '@/components/layout/container';
import { PageHeader } from '@/components/layout/section-header';
import { TopicIcon } from '@/components/icons/topic-icon';
import { TopicPlot } from '@/features/topics/components/topic-plot';
import { isLocale } from '@/i18n/config';
import { i18nFor } from '@/i18n/server';
import { buildMetadata } from '@/lib/seo/metadata';
import { getPublicMetrics, getTopicsWithCounts } from '@/services/public-content.service';

export async function generateMetadata({ params }: PageProps<'/[lang]/topics'>): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const { t } = i18nFor(lang);
  return buildMetadata({ title: t.topics.title, description: t.topics.description, path: '/topics', locale: lang });
}

export default async function TopicsPage({ params }: PageProps<'/[lang]/topics'>) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const { t, href } = i18nFor(lang);
  const [topics, metrics] = await Promise.all([getTopicsWithCounts(lang), getPublicMetrics(lang)]);

  return (
    <Container>
      <PageHeader title={t.topics.title} description={t.topics.description} />
      {topics.length === 0 ? (
        <p className="mt-10 text-muted">{t.topics.empty}</p>
      ) : (
        <>
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {topics.map((topic) => (
              <li
                key={topic.slug}
                data-spotlight
                className="topic-tile group relative rounded-xl border border-rule p-5 transition-colors hover:border-rule-strong"
              >
                <div className="flex items-start justify-between gap-4">
                  <span className="inline-flex size-10 items-center justify-center rounded-lg bg-teal-50">
                    <TopicIcon name={topic.icon} className="size-5 text-teal-700" />
                  </span>
                  <span className="text-sm text-muted tabular">
                    {t.topics.count(topic.article_count)}
                  </span>
                </div>
                <h2 className="mt-4 text-lg font-semibold text-ink">
                  <Link href={href(`/topics/${topic.slug}`)} className="after:absolute after:inset-0 group-hover:underline group-hover:decoration-teal-500 group-hover:underline-offset-4">
                    {topic.name}
                  </Link>
                </h2>
                <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-muted">{topic.description}</p>
              </li>
            ))}
          </ul>
          <section aria-label={t.topics.distribution} className="mt-16">
            <TopicPlot topics={topics} totalArticles={metrics.articles_published} />
          </section>
        </>
      )}
    </Container>
  );
}
