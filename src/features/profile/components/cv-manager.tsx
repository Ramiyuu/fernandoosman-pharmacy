'use client';

import { FileText } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { usePdfUploads } from '@/features/files/client/use-pdf-uploads';
import { PdfDropzone } from '@/features/files/components/pdf-dropzone';
import { useActionRunner } from '@/hooks/use-action-runner';
import { formatBytes, formatDate } from '@/utils/format';

import { removeCvAction } from '../actions';

interface CurrentCv {
  id: string;
  original_filename: string;
  size_bytes: number;
  created_at: string;
}

export function CvManager({ current, maxBytes }: { current: CurrentCv | null; maxBytes: number }) {
  const router = useRouter();
  const { run } = useActionRunner();
  const [confirm, setConfirm] = useState(false);
  const onUploaded = useCallback(() => {
    toast.success('New CV published.');
    router.refresh();
  }, [router]);
  const { items, addFiles, dismiss } = usePdfUploads({ target: 'cv', maxBytes, onUploaded });

  return (
    <section aria-labelledby="cv-heading" className="rounded-xl border border-rule bg-white">
      <header className="border-b border-rule px-5 py-4">
        <h2 id="cv-heading" className="text-base font-semibold text-ink">
          CV (PDF)
        </h2>
        <p className="text-sm text-muted">Offered for viewing and download on /cv. Uploading a new file replaces the current one.</p>
      </header>
      <div className="space-y-4 p-5">
        {current ? (
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-rule p-3">
            <FileText className="size-5 text-navy-700" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink">{current.original_filename}</p>
              <p className="text-xs text-muted">
                {formatBytes(current.size_bytes)}, uploaded {formatDate(current.created_at)}
              </p>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <a href="/api/cv" target="_blank" rel="noopener">
                View
              </a>
            </Button>
            <Button variant="danger-ghost" size="sm" onClick={() => setConfirm(true)}>
              Unpublish
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted">No CV PDF is published.</p>
        )}
        <PdfDropzone items={items} onFiles={addFiles} onDismiss={dismiss} maxBytes={maxBytes} multiple={false} />
      </div>
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="Unpublish the CV PDF?"
        description="Visitors will no longer be able to download it. The file stays in Files, where you can delete it."
        confirmLabel="Unpublish CV"
        onConfirm={() => run(() => removeCvAction())}
      />
    </section>
  );
}
