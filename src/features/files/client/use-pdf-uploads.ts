'use client';

import { useCallback, useState } from 'react';

import { formatBytes } from '@/utils/format';

import { abandonPdfUploadAction, createPdfUploadAction, finalizePdfUploadAction, type UploadedFile } from '../actions';

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

const STORAGE_ERRORS: Record<number, string> = {
  400: 'The upload link is invalid or has expired. Try again.',
  413: 'The file is larger than the storage limit.',
  415: 'Storage accepts PDF files only.',
};

/** PUT the file to the signed URL with progress events (fetch has no upload progress). */
function putWithProgress(url: string, file: File, onProgress: (percent: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open('PUT', url);
    request.setRequestHeader('content-type', 'application/pdf');
    request.setRequestHeader('x-upsert', 'false');
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    request.onload = () =>
      request.status >= 200 && request.status < 300
        ? resolve()
        : reject(new Error(STORAGE_ERRORS[request.status] ?? `Storage rejected the upload (${request.status}).`));
    request.onerror = () => reject(new Error('The connection was interrupted during upload.'));
    request.send(file);
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

      const intent =
        targetKey === 'cv'
          ? { target: 'cv' as const, filename: file.name, size: file.size, mimeType: 'application/pdf' }
          : { target: 'article' as const, articleId: targetKey, filename: file.name, size: file.size, mimeType: 'application/pdf' };

      let ticket;
      try {
        ticket = await createPdfUploadAction(intent);
      } catch {
        return failWith('The server could not be reached.');
      }
      if (!ticket.ok) return failWith(ticket.error);

      update(key, { phase: 'uploading' });
      try {
        await putWithProgress(ticket.data.signedUrl, file, (progress) => update(key, { progress }));
      } catch (error) {
        // Release the reservation so no orphaned record or partial object remains.
        void abandonPdfUploadAction(ticket.data.fileId).catch(() => undefined);
        return failWith(error instanceof Error ? error.message : 'Upload failed.');
      }

      update(key, { phase: 'verifying', progress: 100 });
      let finalized;
      try {
        finalized = await finalizePdfUploadAction(ticket.data.fileId);
      } catch {
        return failWith('The server could not verify the upload.');
      }
      if (!finalized.ok) return failWith(finalized.error);

      update(key, { phase: 'done' });
      onUploaded(finalized.data);
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
