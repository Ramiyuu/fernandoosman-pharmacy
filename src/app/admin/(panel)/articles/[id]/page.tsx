import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { buttonVariants } from '@/components/ui/button';
import { PDF_UPLOAD } from '@/config/uploads';
import { AdminPage } from '@/features/admin/components/admin-page';
import { ArticleEditor } from '@/features/articles/admin/article-editor';
import { requireAdminPage } from '@/lib/auth/session';
import { isUuid } from '@/lib/storage/paths';
import { getArticleForEditor, getEditorOptions } from '@/services/admin/articles.admin';

export const metadata: Metadata = { title: 'Edit article' };

export default async function EditArticlePage({ params }: PageProps<'/admin/articles/[id]'>) {
  const session = await requireAdminPage('articles:write');
  const { id } = await params;
  if (!isUuid(id)) notFound();

  const [article, options] = await Promise.all([
    getArticleForEditor(session.supabase, id),
    getEditorOptions(session.supabase, id),
  ]);
  if (!article) notFound();

  if (article.deleted_at) {
    return (
      <AdminPage title={article.title || 'Untitled draft'} description="This article is in the trash.">
        <p className="text-muted">Restore it from the trash to edit it again.</p>
        <Link href="/admin/articles?view=trash" className={buttonVariants({ variant: 'secondary', className: 'mt-4' })}>
          Open the trash
        </Link>
      </AdminPage>
    );
  }

  return <ArticleEditor key={article.id} article={article} options={options} maxPdfBytes={PDF_UPLOAD.maxBytes} />;
}
