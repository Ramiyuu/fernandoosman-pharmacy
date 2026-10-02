import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { Container } from '@/components/layout/container';
import { PageHeader } from '@/components/layout/section-header';
import { Pagination } from '@/components/navigation/pagination';
import { TopicIcon } from '@/components/icons/topic-icon';
import { JsonLd } from '@/components/seo/json-ld';
import { ArticleCard } from '@/features/articles/components/article-card';
import { parsePageParam } from '@/features/articles/search-params';
import { buildMetadata } from '@/lib/seo/metadata';
import { breadcrumbJsonLd } from '@/lib/seo/structured-data';
import {
  ARTICLES_PAGE_SIZE,
  getPublishedArticles,
  getSiteProfile,
  getTopicBySlug,
} from '@/services/public-content.service';
import { isValidSlug } from '@/utils/slugify';

async function loadTopic(slug: string) {
  return isValidSlug(slug) ? getTopicBySlug(slug) : null;
}

export async function generateMetadata({ params, searchParams }: PageProps<'/topics/[slug]'>): Promise<Metadata> {
  const { slug } = await params;
  const page = parsePageParam((await searchParams).page);
  const topic = await loadTopic(slug);
  if (!topic) return { title: 'Topic not found', robots: { index: false } };
  return buildMetadata({
    title: page > 1 ? `${topic.name} (page ${page})` : topic.name,
    description: topic.description || `Articles about ${topic.name}.`,
    path: page > 1 ? `/topics/${topic.slug}?page=${page}` : `/topics/${topic.slug}`,
  });
}

export default async function TopicPage({ params, searchParams }: PageProps<'/topics/[slug]'>) {
  const { slug } = await params;
  const page = parsePageParam((await searchParams).page);
  const topic = await loadTopic(slug);
  if (!topic) notFound();

  const [articles, profile] = await Promise.all([getPublishedArticles({ topic: topic.slug }, page), getSiteProfile()]);
  const totalPages = Math.max(1, Math.ceil(articles.total / ARTICLES_PAGE_SIZE));
  if (page > totalPages && articles.total > 0) notFound();

  return (
    <Container>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Topics', path: '/topics' },
          { name: topic.name, path: `/topics/${topic.slug}` },
        ])}
      />
      <PageHeader title={topic.name} description={topic.description}>
        <p className="mt-4 inline-flex items-center gap-2 text-sm text-muted">
          <TopicIcon name={topic.icon} className="size-4 text-teal-600" />
          {topic.article_count} published {topic.article_count === 1 ? 'article' : 'articles'}
        </p>
      </PageHeader>

      {articles.items.length > 0 ? (
        <div className="mt-10 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {articles.items.map((article) => (
            <ArticleCard key={article.id} article={article} fallbackAuthor={profile?.full_name ?? ''} headingLevel="h2" />
          ))}
        </div>
      ) : (
        <p className="mt-10 text-muted">No articles in this topic yet.</p>
      )}

      <Pagination
        page={page}
        totalPages={totalPages}
        hrefFor={(target) => (target > 1 ? `/topics/${topic.slug}?page=${target}` : `/topics/${topic.slug}`)}
        className="mt-14"
      />
    </Container>
  );
}
