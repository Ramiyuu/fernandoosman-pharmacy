import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Container } from '@/components/layout/container';
import { PageHeader } from '@/components/layout/section-header';
import { Pagination } from '@/components/navigation/pagination';
import { ArticleCard } from '@/features/articles/components/article-card';
import { ArticleFiltersBar } from '@/features/articles/components/article-filters';
import { articlesHref, hasActiveFilters, parseArticleSearchParams } from '@/features/articles/search-params';
import { buildMetadata } from '@/lib/seo/metadata';
import {
  ARTICLES_PAGE_SIZE,
  getArticleFilterOptions,
  getPublishedArticles,
  getSiteProfile,
} from '@/services/public-content.service';

const DESCRIPTION =
  'Articles on clinical research, biostatistics, pharmacology, evidence-based medicine and medical affairs.';

export async function generateMetadata({ searchParams }: PageProps<'/articles'>): Promise<Metadata> {
  const { filters, page } = parseArticleSearchParams(await searchParams);
  const filtered = hasActiveFilters(filters);
  return buildMetadata({
    title: page > 1 ? `Articles (page ${page})` : 'Articles',
    description: DESCRIPTION,
    // Filtered views are useful for people but thin duplicates for search engines.
    path: filtered ? '/articles' : articlesHref({}, page),
    noIndex: filtered,
  });
}

export default async function ArticlesPage({ searchParams }: PageProps<'/articles'>) {
  const { filters, page } = parseArticleSearchParams(await searchParams);
  const [result, options, profile] = await Promise.all([
    getPublishedArticles(filters, page),
    getArticleFilterOptions(),
    getSiteProfile(),
  ]);

  const totalPages = Math.max(1, Math.ceil(result.total / ARTICLES_PAGE_SIZE));
  if (page > totalPages && result.total > 0) notFound();
  const filtered = hasActiveFilters(filters);

  return (
    <Container>
      <PageHeader title="Articles" description={DESCRIPTION} />
      <div className="mt-8">
        <ArticleFiltersBar options={options} active={filters} />
      </div>
      <p className="mt-6 text-sm text-muted" aria-live="polite">
        {result.total === 1 ? '1 article' : `${result.total} articles`}
        {filtered ? ' match the selected filters' : ''}
      </p>

      {result.items.length > 0 ? (
        <div className="mt-6 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {result.items.map((article) => (
            <ArticleCard key={article.id} article={article} fallbackAuthor={profile?.full_name ?? ''} headingLevel="h2" />
          ))}
        </div>
      ) : (
        <div className="mt-6 rounded-xl border border-dashed border-rule-strong p-10 text-center">
          <p className="font-medium text-ink">No articles match these filters.</p>
          <p className="mt-1 text-sm text-muted">Try removing a filter or browse all topics.</p>
          <div className="mt-4 flex justify-center gap-4 text-sm">
            <Link href="/articles" className="text-azure-700 hover:underline">
              Clear filters
            </Link>
            <Link href="/topics" className="text-azure-700 hover:underline">
              Browse topics
            </Link>
          </div>
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} hrefFor={(target) => articlesHref(filters, target)} className="mt-14" />
    </Container>
  );
}
