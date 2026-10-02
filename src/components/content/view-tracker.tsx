'use client';
import { useEffect } from 'react';
export function ViewTracker({ id, kind }: { id: string; kind: 'article_view' | 'project_view' }) {
  useEffect(() => {
    if (navigator.doNotTrack === '1') return;
    try {
      const key = 'fo-reading-session';
      const session = sessionStorage.getItem(key) ?? crypto.randomUUID();
      sessionStorage.setItem(key, session);
      void fetch('/api/analytics', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ kind, id, session }),
        keepalive: true,
      }).catch(() => {});
    } catch {
      /* Reading remains available when storage is disabled. */
    }
  }, [id, kind]);
  return null;
}
