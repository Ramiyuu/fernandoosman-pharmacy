'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { formatBytes } from '@/utils/format';
export function VideosTable({
  videos,
}: {
  videos: Array<{ id: string; filename: string; size_bytes: number; ready: boolean }>;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);
  return (
    <section className="mt-8 rounded-xl border border-rule bg-white p-5">
      <h2 className="mb-4 text-lg font-semibold">Videos</h2>
      {videos.length ? (
        <ul className="divide-y divide-rule">
          {videos.map((video) => (
            <li key={video.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
              <div>
                <p className="break-all text-sm font-medium">{video.filename}</p>
                <p className="text-xs text-muted">
                  {formatBytes(video.size_bytes)} · {video.ready ? 'Ready' : 'Pending validation'}
                </p>
              </div>
              <div className="flex gap-3">
                {video.ready ? (
                  <a
                    href={`/api/videos/${video.id}`}
                    target="_blank"
                    rel="noopener"
                    className="inline-flex min-h-10 items-center text-sm text-azure-700"
                  >
                    Preview
                  </a>
                ) : null}
                <Button variant="danger-ghost" size="sm" onClick={() => setSelected(video.id)}>
                  Delete video
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">
          Upload MP4/WebM from a saved article or project editor. Videos follow the publication status of that content.
        </p>
      )}
      <ConfirmDialog
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
        title="Delete video?"
        description="This removes the file from storage. Articles that use it will no longer be able to play it."
        confirmLabel="Delete video"
        onConfirm={async () => {
          const response = await fetch('/api/admin/uploads/video', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ action: 'delete', id: selected }),
          });
          if (!response.ok) {
            toast.error('Video could not be deleted. Try again.');
            throw new Error('Delete failed');
          }
          toast.success('Video deleted.');
          setSelected(null);
          router.refresh();
        }}
      />
    </section>
  );
}
