'use client';
import { useState } from 'react';
export function VideoPlayer({ src, title }: { src: string; title: string }) {
  const [active, setActive] = useState(false);
  if (src.startsWith('/api/videos/'))
    return (
      <figure className="my-8">
        <video controls preload="none" className="w-full rounded-lg bg-navy-950" src={src} aria-label={title} />
        <figcaption className="mt-2 text-sm text-muted">{title}</figcaption>
      </figure>
    );
  return (
    <figure className="my-8">
      {active ? (
        <iframe
          src={src}
          title={title}
          loading="lazy"
          referrerPolicy="no-referrer"
          allow="fullscreen; encrypted-media"
          sandbox="allow-scripts allow-same-origin allow-presentation"
          className="aspect-video w-full rounded-lg border-0"
        />
      ) : (
        <button
          type="button"
          className="flex aspect-video w-full flex-col items-center justify-center gap-3 rounded-lg bg-navy-900 p-6 text-white"
          onClick={() => setActive(true)}
        >
          <span className="text-lg font-semibold">Play: {title}</span>
          <span className="text-xs text-navy-200">Loads an external YouTube player</span>
        </button>
      )}
      <figcaption className="mt-2 text-sm text-muted">{title}</figcaption>
    </figure>
  );
}
