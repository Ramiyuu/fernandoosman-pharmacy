'use client';

import { useCallback, useState } from 'react';

import { formatBytes } from '@/utils/format';

import type { UploadedFile } from '../types';

export type UploadPhase = 'checking' | 'uploading' | 'verifying' | 'done' | 'error';

export interface UploadItem {
  key: string;
  name: string;
  size: number;
  progress: number;
  phase: UploadPhase;
  error?: string;
}

type Target = { target: 'article'; articleId: string } | { target: 'cv' };

/**
 * POST the file to the validating Route Handler with progress events (fetch
 * has no upload progress). The server answers only after it has checked the
 * whole file and stored it.
 */
function postWithProgress(
  url: string,
  file: File,
  handlers: { onProgress: (percent: number) => void; onUploaded: () => void },
): Promise<UploadedFile> {
  return new Promise((resolve, reject) => {
    const body = new FormData();
    body.append('file', file);

    const request = new XMLHttpRequest();
    request.open('POST', url);
    request.responseType = 'json';
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) handlers.onProgress(Math.round((event.loaded / event.total) * 100));
    };
    request.upload.onload = handlers.onUploaded;
    request.onload = () => {
      const payload = request.response as (UploadedFile & { error?: string }) | null;
      if (request.status >= 200 && request.status < 300 && payload && !payload.error) resolve(payload);
      else reject(new Error(payload?.error ?? `The upload failed (${request.status}).`));
    };
    request.onerror = () => reject(new Error('The connection was interrupted during upload.'));
    request.send(body);
  });
}

async function looksLikePdf(file: File): Promise<boolean> {
  const head = new Uint8Array(await file.slice(0, 5).arrayBuffer());
  return String.fromCharCode(...head) === '%PDF-';
}

/**
 * Client side of the PDF upload flow. The checks here only give fast
 * feedback; the server repeats every check (and more) before accepting a file.
 */
export function usePdfUploads(options: Target & { maxBytes: number; onUploaded: (file: UploadedFile) => void }) {
  const [items, setItems] = useState<UploadItem[]>([]);
  const { maxBytes, onUploaded } = options;
  const targetKey = options.target === 'article' ? options.articleId : 'cv';

  const update = useCallback((key: string, patch: Partial<UploadItem>) => {
    setItems((current) => current.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  }, []);

  const uploadOne = useCallback(
    async (file: File) => {
      const key = `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setItems((current) => [...current, { key, name: file.name, size: file.size, progress: 0, phase: 'checking' }]);
      const failWith = (error: string) => update(key, { phase: 'error', error });

      if (!/\.pdf$/i.test(file.name)) return failWith('Only .pdf files are accepted.');
      if (file.type && file.type !== 'application/pdf') return failWith('This file is not a PDF.');
      if (file.size === 0) return failWith('The file is empty.');
      if (file.size > maxBytes) return failWith(`The file is larger than ${formatBytes(maxBytes)}.`);
      if (!(await looksLikePdf(file))) return failWith('This file is not a valid PDF.');

      const query = targetKey === 'cv' ? 'target=cv' : `target=article&articleId=${encodeURIComponent(targetKey)}`;
      update(key, { phase: 'uploading' });
      let uploaded: UploadedFile;
      try {
        uploaded = await postWithProgress(`/api/admin/uploads/pdf?${query}`, file, {
          onProgress: (progress) => update(key, { progress }),
          onUploaded: () => update(key, { phase: 'verifying', progress: 100 }),
        });
      } catch (error) {
        return failWith(error instanceof Error ? error.message : 'Upload failed.');
      }

      update(key, { phase: 'done' });
      onUploaded(uploaded);
      // Completed rows disappear once the file shows up in the list.
      setTimeout(() => setItems((current) => current.filter((item) => item.key !== key)), 1500);
    },
    [maxBytes, onUploaded, targetKey, update],
  );

  const addFiles = useCallback(
    (files: FileList | File[]) => {
      for (const file of Array.from(files).slice(0, 10)) void uploadOne(file);
    },
    [uploadOne],
  );

  const dismiss = useCallback((key: string) => setItems((current) => current.filter((item) => item.key !== key)), []);

  return { items, addFiles, dismiss };
}
