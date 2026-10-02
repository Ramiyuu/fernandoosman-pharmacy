import { Search } from 'lucide-react';
import type { Metadata } from 'next';
import Form from 'next/form';
import Link from 'next/link';

import { Container } from '@/components/layout/container';
import { PageHeader } from '@/components/layout/section-header';
import { Pagination } from '@/components/navigation/pagination';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArticleMeta } from '@/features/articles/components/article-meta';
import { parsePageParam } from '@/features/articles/search-params';
import { ProgressBadge } from '@/features/projects/components/project-card';
import { SearchHeadline } from '@/features/search/components/search-headline';
import { buildMetadata } from '@/lib/seo/metadata';
import { SEARCH_PAGE_SIZE, searchContent } from '@/services/public-content.service';

export const metadata: Metadata = buildMetadata({
  title: 'Search',
  description: 'Search articles by title, summary, content, tags and topics.',
  path: '/search',
  noIndex: true,
});

export default async function SearchPage({ searchParams }: PageProps<'/search'>) {
  const params = await searchParams;
  const rawQuery = Array.isArray(params.q) ? params.q[0] : params.q;
  const query = (rawQuery ?? '').trim().slice(0, 200);
  const page = parsePageParam(params.page);
  const results = query ? await searchContent(query, page) : null;
  const totalPages = results ? Math.max(1, Math.ceil(results.total / SEARCH_PAGE_SIZE)) : 1;

  return (
    <Container>
      <PageHeader title="Search" description="Search titles, summaries, full text, tags, topics and categories.">
        <Form action="/search" className="mt-8 flex max-w-2xl gap-2" role="search">
          <label htmlFor="search-query" className="sr-only">
            Search
          </label>
          <Input
            id="search-query"
            name="q"
            type="search"
            defaultValue={query}
            placeholder="e.g. hazard ratio, confidence interval"
            className="h-12 text-base"
            maxLength={200}
          />
          <Button type="submit" size="lg" variant="dark" aria-label="Search">
            <Search aria-hidden="true" />
            <span className="hidden sm:inline">Search</span>
          </Button>
        </Form>
      </PageHeader>

      {results ? (
        <div className="mt-8">
          <p className="text-sm text-muted" aria-live="polite">
            {results.total === 0
              ? `No articles found for “${query}”.`
              : `${results.total} ${results.total === 1 ? 'article' : 'articles'} for “${query}”`}
          </p>

          {results.items.length > 0 ? (
            <ol className="mt-6 divide-y divide-rule border-y border-rule">
              {results.items.map((hit) => (
                <li key={hit.id} className="py-6">
                  {hit.category ? <p className="text-sm font-medium text-teal-700">{hit.category.name}</p> : null}
                  <h2 className="mt-1 text-xl font-semibold text-ink">
                    <Link href={`/articles/${hit.slug}`} className="hover:underline hover:decoration-teal-500 hover:underline-offset-4">
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
              Try a shorter or more general term, or{' '}
              <Link href="/topics" className="text-azure-700 hover:underline">
                browse by topic
              </Link>
              .
            </p>
          )}

          <Pagination
            page={page}
            totalPages={totalPages}
            hrefFor={(target) => `/search?q=${encodeURIComponent(query)}${target > 1 ? `&page=${target}` : ''}`}
            className="mt-10"
          />

          {page === 1 && results.projects.length > 0 ? (
            <section aria-labelledby="project-results" className="mt-14">
              <h2 id="project-results" className="text-lg font-semibold text-ink">
                Matching projects
              </h2>
              <ul className="mt-4 grid gap-4 sm:grid-cols-2">
                {results.projects.map((project) => (
                  <li key={project.id} className="rounded-xl border border-rule p-4">
                    <ProgressBadge progress={project.progress} />
                    <p className="mt-2 font-medium text-ink">
                      <Link href={`/projects/${project.slug}`} className="hover:underline">
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
