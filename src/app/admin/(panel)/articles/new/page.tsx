import type { Metadata } from 'next';

import { PDF_UPLOAD } from '@/config/uploads';
import { ArticleEditor } from '@/features/articles/admin/article-editor';
import { requireAdminPage } from '@/lib/auth/session';
import { getEditorOptions } from '@/services/admin/articles.admin';

export const metadata: Metadata = { title: 'New article' };

export default async function NewArticlePage() {
  const session = await requireAdminPage('articles:write');
  const options = await getEditorOptions(session.db);
  return <ArticleEditor article={null} options={options} maxPdfBytes={PDF_UPLOAD.maxBytes} />;
}
