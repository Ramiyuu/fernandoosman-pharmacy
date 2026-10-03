import { Download, FileText, Lock } from 'lucide-react';

import { getI18n } from '@/i18n/server';
import type { ArticleAttachment } from '@/types/content';
import { formatBytes } from '@/utils/format';

/**
 * Downloads go through /api/files/[id], which re-checks access and redirects
 * to a short-lived signed URL. Storage paths and signed URLs never appear in
 * the page.
 */
export async function AttachmentsList({ files, preview = false }: { files: ArticleAttachment[]; preview?: boolean }) {
  if (files.length === 0) return null;
  const { t } = await getI18n();
  return (
    <section aria-labelledby="attachments-heading" className="mt-12 rounded-xl border border-rule bg-mist p-5">
      <h2 id="attachments-heading" className="text-base font-semibold text-ink">
        {t.article.documents}
      </h2>
      <ul className="mt-3 divide-y divide-rule">
        {files.map((file) => (
          <li key={file.id} className="flex items-center gap-3 py-3">
            <FileText className="size-5 shrink-0 text-navy-700" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <a
                href={`/api/files/${file.id}`}
                target="_blank"
                rel="noopener"
                className="block truncate font-medium text-azure-700 hover:underline"
              >
                {file.label || file.original_filename}
              </a>
              <p className="text-xs text-muted">
                PDF, {formatBytes(file.size_bytes)}
                {file.label ? <span className="ml-2 break-all">{file.original_filename}</span> : null}
              </p>
            </div>
            <a
              href={`/api/files/${file.id}?download=1`}
              className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-azure-700"
              aria-label={t.article.downloadNamed(file.label || file.original_filename)}
            >
              <Download size={16} aria-hidden="true" />
              <span className="hidden sm:inline">{t.article.download}</span>
            </a>
            {preview && file.visibility === 'private' ? (
              <span className="inline-flex items-center gap-1 text-xs text-warning-700">
                <Lock className="size-3" aria-hidden="true" /> {t.article.private}
              </span>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
