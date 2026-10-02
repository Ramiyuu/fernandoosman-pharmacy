import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { JsonLd } from '@/components/seo/json-ld';
import { ArticleView } from '@/features/articles/components/article-view';
import { buildMetadata, truncate } from '@/lib/seo/metadata';
import { articleJsonLd, breadcrumbJsonLd } from '@/lib/seo/structured-data';
import { getArticleBySlug, getSiteProfile } from '@/services/public-content.service';
import { isValidSlug } from '@/utils/slugify';

async function loadArticle(slug: string) {
  return isValidSlug(slug) ? getArticleBySlug(slug) : null;
}

export async function generateMetadata({ params }: PageProps<'/articles/[slug]'>): Promise<Metadata> {
  const { slug } = await params;
  const article = await loadArticle(slug);
  if (!article) return { title: 'Article not found', robots: { index: false } };

  const profile = await getSiteProfile();
  return buildMetadata({
    title: article.seo_title || article.title,
    description: truncate(article.seo_description || article.excerpt || article.subtitle || article.title),
    path: `/articles/${article.slug}`,
    type: 'article',
    publishedTime: article.published_at,
    modifiedTime: article.updated_at,
    authors: [article.author_name ?? profile?.full_name ?? ''],
    tags: article.tags.map((tag) => tag.name),
  });
}

export default async function ArticlePage({ params }: PageProps<'/articles/[slug]'>) {
  const { slug } = await params;
  const article = await loadArticle(slug);
  if (!article) notFound();

  const profile = await getSiteProfile();
  const authorName = article.author_name ?? profile?.full_name ?? '';

  return (
    <>
      <JsonLd data={articleJsonLd(article, authorName)} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Articles', path: '/articles' },
          { name: article.title, path: `/articles/${article.slug}` },
        ])}
      />
      <ArticleView article={article} authorName={authorName} />
    </>
  );
}
