'use client';

import { Eye, FileText, Lock, Globe, Trash2 } from 'lucide-react';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { deleteFileAction, updateFileAction, type UploadedFile } from '@/features/files/actions';
import { usePdfUploads } from '@/features/files/client/use-pdf-uploads';
import { PdfDropzone } from '@/features/files/components/pdf-dropzone';
import type { EditorFile } from '@/services/admin/articles.admin';
import { formatBytes } from '@/utils/format';

interface AttachmentsPanelProps {
  articleId: string;
  initialFiles: EditorFile[];
  maxBytes: number;
}

function UploadArea({ articleId, maxBytes, onUploaded }: { articleId: string; maxBytes: number; onUploaded: (file: UploadedFile) => void }) {
  const { items, addFiles, dismiss } = usePdfUploads({ target: 'article', articleId, maxBytes, onUploaded });
  return <PdfDropzone items={items} onFiles={addFiles} onDismiss={dismiss} maxBytes={maxBytes} />;
}

export function AttachmentsPanel({ articleId, initialFiles, maxBytes }: AttachmentsPanelProps) {
  const [files, setFiles] = useState<EditorFile[]>(initialFiles);
  const [toDelete, setToDelete] = useState<EditorFile | null>(null);

  const onUploaded = useCallback((file: UploadedFile) => setFiles((current) => [...current, file]), []);

  const toggleVisibility = async (file: EditorFile) => {
    const visibility = file.visibility === 'public' ? 'private' : 'public';
    const result = await updateFileAction({ id: file.id, visibility });
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setFiles((current) => current.map((item) => (item.id === file.id ? { ...item, visibility } : item)));
    toast.success(visibility === 'public' ? 'Visible to readers of the published article.' : 'Now private (admins only).');
  };

  const readyFiles = files.filter((file) => file.status === 'ready');

  return (
    <section aria-labelledby="attachments-heading" className="rounded-xl border border-rule bg-white">
      <header className="border-b border-rule px-5 py-4">
        <h2 id="attachments-heading" className="text-base font-semibold text-ink">
          Attachments
        </h2>
        <p className="text-sm text-muted">
          PDFs are stored privately. Public files can be downloaded from the published article through short-lived links;
          private files are visible only to admins.
        </p>
      </header>
      <div className="space-y-4 p-5">
        <UploadArea articleId={articleId} maxBytes={maxBytes} onUploaded={onUploaded} />

        {readyFiles.length > 0 ? (
          <ul className="divide-y divide-rule rounded-lg border border-rule">
            {readyFiles.map((file) => (
              <li key={file.id} className="flex flex-wrap items-center gap-3 px-3 py-3">
                <FileText className="size-5 shrink-0 text-navy-700" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{file.original_filename}</p>
                  <p className="text-xs text-muted">{formatBytes(file.size_bytes)}</p>
                </div>
                <Badge tone={file.visibility === 'public' ? 'teal' : 'neutral'}>
                  {file.visibility === 'public' ? <Globe className="size-3" aria-hidden="true" /> : <Lock className="size-3" aria-hidden="true" />}
                  {file.visibility === 'public' ? 'Public' : 'Private'}
                </Badge>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => void toggleVisibility(file)}>
                    Make {file.visibility === 'public' ? 'private' : 'public'}
                  </Button>
                  <Button variant="ghost" size="icon-sm" asChild>
                    <a href={`/api/files/${file.id}`} target="_blank" rel="noopener" aria-label={`View ${file.original_filename}`}>
                      <Eye aria-hidden="true" />
                    </a>
                  </Button>
                  <Button variant="danger-ghost" size="icon-sm" onClick={() => setToDelete(file)} aria-label={`Remove ${file.original_filename}`}>
                    <Trash2 aria-hidden="true" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">No PDFs attached.</p>
        )}
      </div>

      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(open) => (!open ? setToDelete(null) : undefined)}
        title="Remove PDF?"
        description={<>This action cannot be undone. “{toDelete?.original_filename}” will be deleted from storage and from this article.</>}
        confirmLabel="Remove PDF"
        onConfirm={async () => {
          if (!toDelete) return;
          const result = await deleteFileAction(toDelete.id);
          if (!result.ok) {
            toast.error(result.error);
            throw new Error(result.error);
          }
          setFiles((current) => current.filter((file) => file.id !== toDelete.id));
          toast.success('PDF removed.');
        }}
      />
    </section>
  );
}
