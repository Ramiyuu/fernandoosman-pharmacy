import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { Container } from '@/components/layout/container';
import { PageHeader } from '@/components/layout/section-header';
import { Pagination } from '@/components/navigation/pagination';
import { TopicIcon } from '@/components/icons/topic-icon';
import { JsonLd } from '@/components/seo/json-ld';
import { ArticleCard } from '@/features/articles/components/article-card';
import { parsePageParam } from '@/features/articles/search-params';
import { isLocale, type Locale } from '@/i18n/config';
import { i18nFor } from '@/i18n/server';
import { buildMetadata } from '@/lib/seo/metadata';
import { breadcrumbJsonLd } from '@/lib/seo/structured-data';
import {
  ARTICLES_PAGE_SIZE,
  getPublishedArticles,
  getSiteProfile,
  getTopicBySlug,
} from '@/services/public-content.service';
import { isValidSlug } from '@/utils/slugify';

async function loadTopic(slug: string, locale: Locale) {
  return isValidSlug(slug) ? getTopicBySlug(slug, locale) : null;
}

export async function generateMetadata({ params, searchParams }: PageProps<'/[lang]/topics/[slug]'>): Promise<Metadata> {
  const { lang, slug } = await params;
  if (!isLocale(lang)) return {};
  const { t } = i18nFor(lang);
  const page = parsePageParam((await searchParams).page);
  const topic = await loadTopic(slug, lang);
  if (!topic) return { title: t.topics.notFound, robots: { index: false } };
  return buildMetadata({
    title: page > 1 ? t.meta.pageSuffix(topic.name, page) : topic.name,
    description: topic.description || t.topics.about(topic.name),
    path: page > 1 ? `/topics/${topic.slug}?page=${page}` : `/topics/${topic.slug}`,
    locale: lang,
  });
}

export default async function TopicPage({ params, searchParams }: PageProps<'/[lang]/topics/[slug]'>) {
  const { lang, slug } = await params;
  if (!isLocale(lang)) notFound();
  const { t, href } = i18nFor(lang);
  const page = parsePageParam((await searchParams).page);
  const topic = await loadTopic(slug, lang);
  if (!topic) notFound();

  const [articles, profile] = await Promise.all([
    getPublishedArticles({ topic: topic.slug }, page, ARTICLES_PAGE_SIZE, lang),
    getSiteProfile(lang),
  ]);
  const totalPages = Math.max(1, Math.ceil(articles.total / ARTICLES_PAGE_SIZE));
  if (page > totalPages && articles.total > 0) notFound();

  return (
    <Container>
      <JsonLd
        data={breadcrumbJsonLd(
          [
            { name: t.nav.home, path: '/' },
            { name: t.topics.title, path: '/topics' },
            { name: topic.name, path: `/topics/${topic.slug}` },
          ],
          lang,
        )}
      />
      <PageHeader title={topic.name} description={topic.description}>
        <p className="mt-4 inline-flex items-center gap-2 text-sm text-muted">
          <TopicIcon name={topic.icon} className="size-4 text-teal-600" />
          {t.topics.publishedCount(topic.article_count)}
        </p>
      </PageHeader>

      {articles.items.length > 0 ? (
        <div className="card-grid mt-10 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {articles.items.map((article, index) => (
            <ArticleCard
              key={article.id}
              article={article}
              fallbackAuthor={profile?.full_name ?? ''}
              headingLevel="h2"
              index={index}
            />
          ))}
        </div>
      ) : (
        <p className="mt-10 text-muted">{t.topics.noArticles}</p>
      )}

      <Pagination
        page={page}
        totalPages={totalPages}
        hrefFor={(target) =>
          target > 1 ? href(`/topics/${topic.slug}?page=${target}`) : href(`/topics/${topic.slug}`)
        }
        className="mt-14"
      />
    </Container>
  );
}
