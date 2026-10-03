import { Eye } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { StatusBadge } from '@/features/admin/components/admin-page';
import { ArticleView } from '@/features/articles/components/article-view';
import { asRichTextDoc } from '@/lib/content/rich-text';
import { requireAdminPage } from '@/lib/auth/session';
import { sql } from '@/lib/db/sql';
import { isUuid } from '@/lib/storage/paths';
import { getSiteProfile, getSiteSettings } from '@/services/public-content.service';
import { failQuery } from '@/services/errors';
import type { ArticleDetail } from '@/types/content';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Preview', robots: { index: false, follow: false } };

/**
 * Private preview of any article (drafts included). Access is checked here on
 * the server, and the data is read as web_admin bound to the admin's profile, so RLS applies:
 * an anonymous request can never load an unpublished article, even by id.
 */
export default async function ArticlePreviewPage({ params }: PageProps<'/preview/articles/[id]'>) {
  const session = await requireAdminPage('articles:write');
  const { id } = await params;
  if (!isUuid(id)) notFound();

  let raw: ArticleDetail | null;
  try {
    const row = await session.db.one<{ value: ArticleDetail | null }>(
      sql`select public.article_detail_json(${id}::uuid, true) as value`,
    );
    raw = row.value;
  } catch (error) {
    failQuery('preview.article', error);
  }
  if (!raw) notFound();

  const article: ArticleDetail = { ...raw, content: asRichTextDoc(raw.content) };
  const [settings, profile] = await Promise.all([getSiteSettings('en'), getSiteProfile('en')]);

  return (
    <>
      <div role="status" className="sticky top-0 z-50 flex flex-wrap items-center justify-center gap-3 bg-warning-50 px-4 py-2 text-sm text-warning-700">
        <Eye className="size-4" aria-hidden="true" />
        <span>Private preview. Visitors cannot see this page.</span>
        <StatusBadge status={article.status} />
        <Link href={`/admin/articles/${article.id}`} className="font-medium underline">
          Back to the editor
        </Link>
      </div>
      <SiteHeader siteName={settings.site.name} languageSwitcher={false} />
      <main id="main">
        <ArticleView article={article} authorName={article.author_name ?? profile?.full_name ?? ''} preview />
      </main>
      <SiteFooter siteName={settings.site.name} tagline={settings.site.tagline} profile={profile} />
    </>
  );
}
