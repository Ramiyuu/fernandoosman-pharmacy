'use client';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { safeVideoSource } from '@/lib/content/video';
export function VideoControls({ onInsert }: { onInsert: (src: string, title: string) => void }) {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <details className="border-b border-rule bg-mist px-4 py-3 text-sm">
      <summary className="cursor-pointer font-medium">Video & external media</summary>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Input
          aria-label="Video title"
          placeholder="Video title / accessible description"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <Input
          aria-label="Video URL"
          placeholder="YouTube URL or /api/videos/id"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            const src = safeVideoSource(url);
            if (!src || !title.trim()) return toast.error('Add a supported URL and a video title.');
            onInsert(src, title);
            setUrl('');
          }}
        >
          Insert video link
        </Button>
        <label className="text-sm">
          Upload MP4/WebM (up to 500 MB)
          <input
            className="mt-2 block max-w-full"
            type="file"
            accept="video/mp4,video/webm"
            disabled={busy}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const match = location.pathname.match(/^\/admin\/(articles|projects)\/([a-f0-9-]{36})$/);
              if (!match) return toast.error('Save this article or project before uploading a video.');
              if (!title.trim()) return toast.error('Add a video title first.');
              setBusy(true);
              try {
                const send = async (body: unknown) => {
                  const r = await fetch('/api/admin/uploads/video', {
                    method: 'POST',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify(body),
                  });
                  const d = await r.json();
                  if (!r.ok) throw new Error(d.error);
                  return d;
                };
                const start = await send({
                  action: 'start',
                  filename: file.name,
                  mime: file.type,
                  size: file.size,
                  [match[1] === 'articles' ? 'articleId' : 'projectId']: match[2],
                });
                const upload = await fetch(start.url, {
                  method: 'PUT',
                  headers: { 'content-type': file.type },
                  body: file,
                });
                if (!upload.ok) throw new Error('Storage upload failed. Check the bucket CORS configuration.');
                const done = await send({ action: 'complete', id: start.id });
                onInsert(done.src, title);
                toast.success('Video uploaded. Save the content to keep the insertion.');
              } catch (error) {
                toast.error(error instanceof Error ? error.message : 'Upload failed.');
              } finally {
                setBusy(false);
              }
            }}
          />
        </label>
        {busy ? <p role="status">Uploading directly to storage and validating…</p> : null}
        <p className="text-xs text-muted sm:col-span-2">
          Provide captions within your video, and a transcript in the article. External players load only after the
          reader chooses to play.
        </p>
      </div>
    </details>
  );
}
