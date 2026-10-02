import { Plus, Search, Star } from 'lucide-react';
import type { Metadata } from 'next';
import Form from 'next/form';
import Link from 'next/link';

import { Pagination } from '@/components/navigation/pagination';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AdminPage, EmptyState, StatusBadge, tableClasses } from '@/features/admin/components/admin-page';
import { ArticleRowActions } from '@/features/articles/admin/article-row-actions';
import { parsePageParam } from '@/features/articles/search-params';
import { requireAdminPage } from '@/lib/auth/session';
import { ADMIN_PAGE_SIZE, listAdminArticles, type ArticleListView } from '@/services/admin/articles.admin';
import { cn } from '@/utils/cn';
import { formatDate } from '@/utils/format';

export const metadata: Metadata = { title: 'Articles' };

const VIEWS: Array<{ value: ArticleListView; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'draft', label: 'Drafts' },
  { value: 'published', label: 'Published' },
  { value: 'archived', label: 'Archived' },
  { value: 'trash', label: 'Trash' },
];

function hrefFor(view: ArticleListView, query: string, page = 1) {
  const params = new URLSearchParams();
  if (view !== 'all') params.set('view', view);
  if (query) params.set('q', query);
  if (page > 1) params.set('page', String(page));
  const search = params.toString();
  return search ? `/admin/articles?${search}` : '/admin/articles';
}

export default async function AdminArticlesPage({ searchParams }: PageProps<'/admin/articles'>) {
  const session = await requireAdminPage();
  const params = await searchParams;
  const rawView = Array.isArray(params.view) ? params.view[0] : params.view;
  const view = (VIEWS.find((option) => option.value === rawView)?.value ?? 'all') as ArticleListView;
  const query = (Array.isArray(params.q) ? params.q[0] : (params.q ?? '')).trim().slice(0, 100);
  const page = parsePageParam(params.page);

  const result = await listAdminArticles(session.supabase, { view, query, page });
  const totalPages = Math.max(1, Math.ceil(result.total / ADMIN_PAGE_SIZE));

  return (
    <AdminPage
      title="Articles"
      description="Write, publish and organise articles."
      actions={
        <Link href="/admin/articles/new" className={buttonVariants()}>
          <Plus aria-hidden="true" /> New article
        </Link>
      }
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Filter by status" className="flex flex-wrap gap-1 rounded-lg bg-white p-1 ring-1 ring-rule">
          {VIEWS.map((option) => (
            <Link
              key={option.value}
              href={hrefFor(option.value, query)}
              aria-current={option.value === view ? 'page' : undefined}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm text-navy-800 hover:bg-navy-50',
                option.value === view && 'bg-navy-900 text-white hover:bg-navy-900',
              )}
            >
              {option.label}
            </Link>
          ))}
        </nav>
        <Form action="/admin/articles" className="flex gap-2" role="search">
          {view !== 'all' ? <input type="hidden" name="view" value={view} /> : null}
          <label htmlFor="admin-article-search" className="sr-only">
            Search by title
          </label>
          <Input id="admin-article-search" name="q" type="search" defaultValue={query} placeholder="Search by title" className="w-56" />
          <button type="submit" className={buttonVariants({ variant: 'secondary', size: 'icon' })} aria-label="Search">
            <Search aria-hidden="true" />
          </button>
        </Form>
      </div>

      {result.items.length === 0 ? (
        <EmptyState
          title={view === 'trash' ? 'The trash is empty.' : query ? 'No articles match this search.' : 'No articles yet.'}
          description={view === 'trash' ? undefined : 'Start with a draft; it is saved automatically while you write.'}
          action={
            view === 'trash' ? undefined : (
              <Link href="/admin/articles/new" className={buttonVariants()}>
                <Plus aria-hidden="true" /> New article
              </Link>
            )
          }
        />
      ) : (
        <div className={tableClasses.wrapper}>
          <table className={tableClasses.table}>
            <thead className={tableClasses.head}>
              <tr>
                <th scope="col" className={tableClasses.th}>
                  Title
                </th>
                <th scope="col" className={tableClasses.th}>
                  Status
                </th>
                <th scope="col" className={tableClasses.th}>
                  Language
                </th>
                <th scope="col" className={tableClasses.th}>
                  {view === 'trash' ? 'Deleted' : 'Updated'}
                </th>
                <th scope="col" className={cn(tableClasses.th, 'w-12')}>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {result.items.map((article) => (
                <tr key={article.id} className={tableClasses.row}>
                  <td className={tableClasses.td}>
                    <div className="flex items-center gap-2">
                      {view === 'trash' ? (
                        <span className="font-medium text-ink">{article.title || 'Untitled draft'}</span>
                      ) : (
                        <Link href={`/admin/articles/${article.id}`} className="font-medium text-ink hover:underline">
                          {article.title || 'Untitled draft'}
                        </Link>
                      )}
                      {article.featured ? (
                        <Star className="size-3.5 fill-teal-500 text-teal-500" aria-label="Featured" />
                      ) : null}
                    </div>
                    <p className="mt-0.5 text-xs text-muted">/{article.slug}</p>
                  </td>
                  <td className={tableClasses.td}>
                    {article.deleted_at ? <Badge tone="danger">In trash</Badge> : <StatusBadge status={article.status} />}
                  </td>
                  <td className={cn(tableClasses.td, 'uppercase text-muted')}>{article.language}</td>
                  <td className={cn(tableClasses.td, 'whitespace-nowrap text-muted')}>
                    {formatDate(article.deleted_at ?? article.updated_at)}
                  </td>
                  <td className={tableClasses.td}>
                    <ArticleRowActions
                      id={article.id}
                      title={article.title}
                      slug={article.slug}
                      status={article.status}
                      deleted={Boolean(article.deleted_at)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} hrefFor={(target) => hrefFor(view, query, target)} className="mt-6" />
    </AdminPage>
  );
}
