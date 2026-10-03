import { Search } from 'lucide-react';
import type { Metadata } from 'next';
import Form from 'next/form';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Container } from '@/components/layout/container';
import { PageHeader } from '@/components/layout/section-header';
import { Pagination } from '@/components/navigation/pagination';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArticleMeta } from '@/features/articles/components/article-meta';
import { parsePageParam } from '@/features/articles/search-params';
import { ProgressBadge } from '@/features/projects/components/project-card';
import { SearchHeadline } from '@/features/search/components/search-headline';
import { HTML_LANG, isLocale } from '@/i18n/config';
import { i18nFor } from '@/i18n/server';
import { buildMetadata } from '@/lib/seo/metadata';
import { SEARCH_PAGE_SIZE, searchContent } from '@/services/public-content.service';

export async function generateMetadata({ params }: PageProps<'/[lang]/search'>): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const { t } = i18nFor(lang);
  return buildMetadata({ title: t.search.title, description: t.search.metaDescription, path: '/search', locale: lang, noIndex: true });
}

export default async function SearchPage({ params: routeParams, searchParams }: PageProps<'/[lang]/search'>) {
  const { lang } = await routeParams;
  if (!isLocale(lang)) notFound();
  const { t, href } = i18nFor(lang);
  const copy = t.search;
  const base = href('/search');
  const params = await searchParams;
  const rawQuery = Array.isArray(params.q) ? params.q[0] : params.q;
  const query = (rawQuery ?? '').trim().slice(0, 200);
  const page = parsePageParam(params.page);
  const results = query ? await searchContent(query, page, lang) : null;
  const totalPages = results ? Math.max(1, Math.ceil(results.total / SEARCH_PAGE_SIZE)) : 1;

  return (
    <Container>
      <PageHeader title={copy.title} description={copy.description}>
        <Form action={base} className="mt-8 flex max-w-2xl gap-2" role="search">
          <label htmlFor="search-query" className="sr-only">
            {copy.label}
          </label>
          <Input
            id="search-query"
            name="q"
            type="search"
            defaultValue={query}
            placeholder={copy.placeholder}
            className="h-12 text-base"
            maxLength={200}
          />
          <Button type="submit" size="lg" variant="dark" aria-label={copy.label}>
            <Search aria-hidden="true" />
            <span className="hidden sm:inline">{copy.label}</span>
          </Button>
        </Form>
      </PageHeader>

      {results ? (
        <div className="mt-8">
          <p className="text-sm text-muted" aria-live="polite">
            {results.total === 0 ? copy.none(query) : copy.results(results.total, query)}
          </p>

          {results.items.length > 0 ? (
            <ol className="mt-6 divide-y divide-rule border-y border-rule">
              {results.items.map((hit) => (
                <li key={hit.id} className="py-6" lang={hit.language !== lang ? HTML_LANG[hit.language] : undefined}>
                  {hit.category ? <p className="text-sm font-medium text-teal-700">{hit.category.name}</p> : null}
                  <h2 className="mt-1 text-xl font-semibold text-ink">
                    <Link href={href(`/articles/${hit.slug}`)} className="hover:underline hover:decoration-teal-500 hover:underline-offset-4">
                      {hit.title}
                    </Link>
                  </h2>
                  <p className="mt-2 max-w-3xl leading-relaxed text-muted">
                    <SearchHeadline text={hit.headline || hit.excerpt} />
                  </p>
                  <ArticleMeta publishedAt={hit.published_at} readingTime={hit.reading_time} className="mt-3" />
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-4 text-muted">
              {copy.tryShorter}{' '}
              <Link href={href('/topics')} className="text-azure-700 hover:underline">
                {copy.browseByTopic}
              </Link>
              .
            </p>
          )}

          <Pagination
            page={page}
            totalPages={totalPages}
            hrefFor={(target) => `${base}?q=${encodeURIComponent(query)}${target > 1 ? `&page=${target}` : ''}`}
            className="mt-10"
          />

          {page === 1 && results.projects.length > 0 ? (
            <section aria-labelledby="project-results" className="mt-14">
              <h2 id="project-results" className="text-lg font-semibold text-ink">
                {copy.projects}
              </h2>
              <ul className="mt-4 grid gap-4 sm:grid-cols-2">
                {results.projects.map((project) => (
                  <li key={project.id} className="rounded-xl border border-rule p-4">
                    <ProgressBadge progress={project.progress} />
                    <p className="mt-2 font-medium text-ink">
                      <Link href={href(`/projects/${project.slug}`)} className="hover:underline">
                        {project.title}
                      </Link>
                    </p>
                    <p className="mt-1 line-clamp-2 text-sm text-muted">{project.summary}</p>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      ) : null}
    </Container>
  );
}
