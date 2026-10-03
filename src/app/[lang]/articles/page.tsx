import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Container } from '@/components/layout/container';
import { PageHeader } from '@/components/layout/section-header';
import { Pagination } from '@/components/navigation/pagination';
import { ArticleCard } from '@/features/articles/components/article-card';
import { ArticleFiltersBar } from '@/features/articles/components/article-filters';
import { articlesHref, hasActiveFilters, parseArticleSearchParams } from '@/features/articles/search-params';
import { isLocale } from '@/i18n/config';
import { i18nFor } from '@/i18n/server';
import { buildMetadata } from '@/lib/seo/metadata';
import {
  ARTICLES_PAGE_SIZE,
  getArticleFilterOptions,
  getPublishedArticles,
  getSiteProfile,
} from '@/services/public-content.service';

export async function generateMetadata({ params, searchParams }: PageProps<'/[lang]/articles'>): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const { t } = i18nFor(lang);
  const { filters, page } = parseArticleSearchParams(await searchParams);
  const filtered = hasActiveFilters(filters);
  return buildMetadata({
    title: page > 1 ? t.meta.pageSuffix(t.articles.title, page) : t.articles.title,
    description: t.articles.description,
    // Filtered views are useful for people but thin duplicates for search engines.
    path: filtered ? '/articles' : articlesHref({}, page),
    locale: lang,
    noIndex: filtered,
  });
}

export default async function ArticlesPage({ params, searchParams }: PageProps<'/[lang]/articles'>) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const { t, href } = i18nFor(lang);
  const { filters, page } = parseArticleSearchParams(await searchParams);
  const [result, options, profile] = await Promise.all([
    getPublishedArticles(filters, page, ARTICLES_PAGE_SIZE, lang),
    getArticleFilterOptions(lang),
    getSiteProfile(lang),
  ]);

  const totalPages = Math.max(1, Math.ceil(result.total / ARTICLES_PAGE_SIZE));
  if (page > totalPages && result.total > 0) notFound();
  const filtered = hasActiveFilters(filters);
  const base = href('/articles');

  return (
    <Container>
      <PageHeader title={t.articles.title} description={t.articles.description} />
      <div className="mt-8">
        <ArticleFiltersBar options={options} active={filters} action={base} labels={t.filters} />
      </div>
      <p className="mt-6 text-sm text-muted" aria-live="polite">
        {t.articles.count(result.total)}
        {filtered ? t.articles.matchFilters : ''}
      </p>

      {result.items.length > 0 ? (
        <div className="card-grid mt-6 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {result.items.map((article, index) => (
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
        <div className="mt-6 rounded-xl border border-dashed border-rule-strong p-10 text-center">
          <p className="font-medium text-ink">{t.articles.noMatch}</p>
          <p className="mt-1 text-sm text-muted">{t.articles.noMatchHint}</p>
          <div className="mt-4 flex justify-center gap-4 text-sm">
            <Link href={base} className="text-azure-700 hover:underline">
              {t.articles.clearFilters}
            </Link>
            <Link href={href('/topics')} className="text-azure-700 hover:underline">
              {t.articles.browseTopics}
            </Link>
          </div>
        </div>
      )}

      <Pagination
        page={page}
        totalPages={totalPages}
        hrefFor={(target) => articlesHref(filters, target, base)}
        className="mt-14"
      />
    </Container>
  );
}
