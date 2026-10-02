'use client';

import { Download, Eye, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { tableClasses } from '@/features/admin/components/admin-page';
import { useActionRunner } from '@/hooks/use-action-runner';
import { publicImageUrl } from '@/lib/storage/public-url';
import type { AdminDocument, AdminImage } from '@/services/admin/files.admin';
import { cn } from '@/utils/cn';
import { formatBytes, formatDate } from '@/utils/format';
import type { ImageBucket } from '@/config/uploads';

import { deleteFileAction, deleteImageAction } from '../actions';

const STATUS_TONE = { ready: 'success', pending: 'warning', failed: 'danger' } as const;

export function DocumentsTable({ documents }: { documents: AdminDocument[] }) {
  const { run } = useActionRunner();
  const [toDelete, setToDelete] = useState<AdminDocument | null>(null);

  const warning = (file: AdminDocument) => {
    if (file.status !== 'ready') return 'This upload never completed, so it is not offered anywhere.';
    if (file.is_current_cv) return 'This is the CV currently offered on /cv. The CV download will stop working until you upload a new one.';
    if (file.article) {
      return `It is attached to the article “${file.article.title || 'Untitled'}”${file.article.status === 'published' ? ', which is published' : ''}. The article will no longer offer this document.`;
    }
    return 'It is not linked to any article.';
  };

  return (
    <>
      <div className={tableClasses.wrapper}>
        <table className={cn(tableClasses.table, 'min-w-[60rem]')}>
          <thead className={tableClasses.head}>
            <tr>
              <th scope="col" className={tableClasses.th}>Filename</th>
              <th scope="col" className={tableClasses.th}>Type</th>
              <th scope="col" className={tableClasses.th}>Size</th>
              <th scope="col" className={tableClasses.th}>Related article</th>
              <th scope="col" className={tableClasses.th}>Created</th>
              <th scope="col" className={tableClasses.th}>Storage path</th>
              <th scope="col" className={tableClasses.th}>
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {documents.map((file) => (
              <tr key={file.id} className={tableClasses.row}>
                <td className={cn(tableClasses.td, 'max-w-64')}>
                  <p className="truncate font-medium text-ink" title={file.original_filename}>
                    {file.original_filename}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    <Badge tone={STATUS_TONE[file.status]}>{file.status}</Badge>
                    <Badge tone={file.visibility === 'public' ? 'teal' : 'neutral'}>{file.visibility}</Badge>
                    {file.is_current_cv ? <Badge tone="blue">Current CV</Badge> : null}
                  </div>
                </td>
                <td className={cn(tableClasses.td, 'text-muted')}>{file.kind === 'cv' ? 'CV (PDF)' : 'PDF'}</td>
                <td className={cn(tableClasses.td, 'whitespace-nowrap tabular')}>{formatBytes(file.size_bytes)}</td>
                <td className={tableClasses.td}>
                  {file.article ? (
                    <Link href={`/admin/articles/${file.article.id}`} className="text-azure-700 hover:underline">
                      {file.article.title || 'Untitled draft'}
                    </Link>
                  ) : (
                    <span className="text-muted">None</span>
                  )}
                </td>
                <td className={cn(tableClasses.td, 'whitespace-nowrap text-muted')}>{formatDate(file.created_at)}</td>
                <td className={cn(tableClasses.td, 'max-w-56')}>
                  <code className="block truncate text-xs text-muted" title={file.storage_path}>
                    {file.storage_path}
                  </code>
                </td>
                <td className={tableClasses.td}>
                  <div className="flex justify-end gap-1">
                    {file.status === 'ready' ? (
                      <>
                        <Button variant="ghost" size="icon-sm" asChild>
                          <a href={`/api/files/${file.id}`} target="_blank" rel="noopener" aria-label={`View ${file.original_filename}`}>
                            <Eye aria-hidden="true" />
                          </a>
                        </Button>
                        <Button variant="ghost" size="icon-sm" asChild>
                          <a href={`/api/files/${file.id}?download=1`} aria-label={`Download ${file.original_filename}`}>
                            <Download aria-hidden="true" />
                          </a>
                        </Button>
                      </>
                    ) : null}
                    <Button variant="danger-ghost" size="icon-sm" onClick={() => setToDelete(file)} aria-label={`Delete ${file.original_filename}`}>
                      <Trash2 aria-hidden="true" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(open) => (!open ? setToDelete(null) : undefined)}
        title="Delete file?"
        description={
          toDelete ? (
            <>
              This action cannot be undone. {warning(toDelete)}
            </>
          ) : null
        }
        confirmLabel="Delete file"
        onConfirm={() => (toDelete ? run(() => deleteFileAction(toDelete.id)) : undefined)}
      />
    </>
  );
}

export function ImagesTable({ images }: { images: AdminImage[] }) {
  const { run } = useActionRunner();
  const [toDelete, setToDelete] = useState<AdminImage | null>(null);

  return (
    <>
      <div className={tableClasses.wrapper}>
        <table className={cn(tableClasses.table, 'min-w-[50rem]')}>
          <thead className={tableClasses.head}>
            <tr>
              <th scope="col" className={tableClasses.th}>Image</th>
              <th scope="col" className={tableClasses.th}>Bucket</th>
              <th scope="col" className={tableClasses.th}>Size</th>
              <th scope="col" className={tableClasses.th}>Created</th>
              <th scope="col" className={tableClasses.th}>Storage path</th>
              <th scope="col" className={tableClasses.th}>
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {images.map((image) => {
              const url = publicImageUrl(image.bucket as ImageBucket, image.storage_path);
              return (
                <tr key={image.id} className={tableClasses.row}>
                  <td className={tableClasses.td}>
                    <p className="max-w-56 truncate font-medium text-ink">{image.original_filename}</p>
                    <p className="text-xs text-muted">
                      {image.mime_type}
                      {image.width && image.height ? `, ${image.width}×${image.height}` : ''}
                    </p>
                  </td>
                  <td className={cn(tableClasses.td, 'text-muted')}>{image.bucket}</td>
                  <td className={cn(tableClasses.td, 'tabular')}>{formatBytes(image.size_bytes)}</td>
                  <td className={cn(tableClasses.td, 'whitespace-nowrap text-muted')}>{formatDate(image.created_at)}</td>
                  <td className={cn(tableClasses.td, 'max-w-56')}>
                    <code className="block truncate text-xs text-muted">{image.storage_path}</code>
                  </td>
                  <td className={tableClasses.td}>
                    <div className="flex justify-end gap-1">
                      {url ? (
                        <Button variant="ghost" size="icon-sm" asChild>
                          <a href={url} target="_blank" rel="noopener noreferrer" aria-label={`View ${image.original_filename}`}>
                            <Eye aria-hidden="true" />
                          </a>
                        </Button>
                      ) : null}
                      <Button variant="danger-ghost" size="icon-sm" onClick={() => setToDelete(image)} aria-label={`Delete ${image.original_filename}`}>
                        <Trash2 aria-hidden="true" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(open) => (!open ? setToDelete(null) : undefined)}
        title="Delete image?"
        description="This action cannot be undone. If the image is used as a cover, a photo or inside an article, it will stop displaying there."
        confirmLabel="Delete image"
        onConfirm={() => (toDelete ? run(() => deleteImageAction(toDelete.id)) : undefined)}
      />
    </>
  );
}
