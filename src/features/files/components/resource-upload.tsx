'use client';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
export function ResourceUpload({
  value,
  onChange,
  projectId,
}: {
  value: string | null;
  onChange: (id: string | null) => void;
  projectId?: string;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <div className="space-y-2 text-sm">
      <label className="block font-medium">
        Attach PDF
        <input
          className="mt-2 block max-w-full text-sm"
          type="file"
          accept="application/pdf"
          disabled={busy}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const body = new FormData();
            body.set('file', file);
            setBusy(true);
            try {
              const response = await fetch(
                `/api/admin/uploads/pdf?target=resource${projectId ? `&projectId=${projectId}` : ''}`,
                { method: 'POST', body },
              );
              const result = await response.json();
              if (!response.ok) throw new Error(result.error);
              onChange(result.id);
              toast.success('PDF uploaded. Save the profile to publish this certificate.');
            } catch (error) {
              toast.error(error instanceof Error ? error.message : 'Upload failed.');
            } finally {
              setBusy(false);
            }
          }}
        />
      </label>
      {busy ? <p role="status">Validating and uploading…</p> : null}
      {value ? (
        <div className="flex gap-3">
          <a href={`/api/files/${value}`} target="_blank" rel="noopener" className="text-azure-700 underline">
            Preview PDF
          </a>
          <Button size="sm" variant="ghost" onClick={() => onChange(null)}>
            Detach
          </Button>
        </div>
      ) : null}
    </div>
  );
}
