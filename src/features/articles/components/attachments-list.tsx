import { FileText, Lock } from 'lucide-react';

import type { ArticleAttachment } from '@/types/content';
import { formatBytes } from '@/utils/format';

/**
 * Downloads go through /api/files/[id], which re-checks access and redirects
 * to a short-lived signed URL. Storage paths and signed URLs never appear in
 * the page.
 */
export function AttachmentsList({ files, preview = false }: { files: ArticleAttachment[]; preview?: boolean }) {
  if (files.length === 0) return null;
  return (
    <section aria-labelledby="attachments-heading" className="mt-12 rounded-xl border border-rule bg-mist p-5">
      <h2 id="attachments-heading" className="text-base font-semibold text-ink">
        Documents
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
            {preview && file.visibility === 'private' ? (
              <span className="inline-flex items-center gap-1 text-xs text-warning-700">
                <Lock className="size-3" aria-hidden="true" /> Private
              </span>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
