import 'server-only';

import { PDF_UPLOAD } from '@/config/uploads';
import { createLogger, describeError } from '@/lib/logger';
import { detectFileKind, hasPdfTrailer, isPdf } from '@/lib/security/file-signature';
import { isImageBucket, isSafeImagePath, isSafePdfPath } from '@/lib/storage/paths';
import { createServiceSupabase } from '@/lib/supabase/admin';

/**
 * All Storage access goes through here. Callers MUST authorise the request
 * first: these helpers use the service role, which bypasses Storage RLS.
 */

const log = createLogger('storage');
const DOCUMENTS = PDF_UPLOAD.bucket;

function assertPdfPath(path: string) {
  if (!isSafePdfPath(path)) throw new Error('Refusing to use an unexpected storage path');
}

/** Short-lived signed URL for a private document. Never persist the result. */
export async function createDocumentSignedUrl(path: string, downloadName?: string): Promise<string | null> {
  assertPdfPath(path);
  const { data, error } = await createServiceSupabase()
    .storage.from(DOCUMENTS)
    .createSignedUrl(path, PDF_UPLOAD.signedUrlTtlSeconds, downloadName ? { download: downloadName } : undefined);
  if (error || !data) {
    log.error('Could not sign document URL', { error: describeError(error) });
    return null;
  }
  return data.signedUrl;
}

/** One-time upload URL for a server-chosen path (valid ~2h, no overwrite). */
export async function createDocumentUploadUrl(path: string): Promise<{ signedUrl: string } | null> {
  assertPdfPath(path);
  const { data, error } = await createServiceSupabase().storage.from(DOCUMENTS).createSignedUploadUrl(path, { upsert: false });
  if (error || !data) {
    log.error('Could not create signed upload URL', { error: describeError(error) });
    return null;
  }
  return { signedUrl: data.signedUrl };
}

export async function removeDocuments(paths: string[]): Promise<boolean> {
  const safe = paths.filter(isSafePdfPath);
  if (safe.length === 0) return true;
  const { error } = await createServiceSupabase().storage.from(DOCUMENTS).remove(safe);
  if (error) log.error('Could not remove documents', { error: describeError(error), count: safe.length });
  return !error;
}

async function readRange(url: string, range: string, maxBytes: number): Promise<Uint8Array | null> {
  const response = await fetch(url, { headers: { Range: range }, cache: 'no-store' });
  if (!response.ok || !response.body) return null;

  // If the server ignored the Range header, stream and keep only what we need.
  const keepTail = range.startsWith('bytes=-');
  const reader = response.body.getReader();
  let buffer = new Uint8Array(0);
  for (;;) {
    const { done, value } = await reader.read();
    if (done || !value) break;
    const merged = new Uint8Array(buffer.length + value.length);
    merged.set(buffer);
    merged.set(value, buffer.length);
    buffer = keepTail ? merged.slice(-maxBytes) : merged;
    if (!keepTail && buffer.length >= maxBytes) {
      await reader.cancel();
      break;
    }
  }
  return keepTail ? buffer.slice(-maxBytes) : buffer.slice(0, maxBytes);
}

export type PdfVerification =
  | { ok: true; size: number }
  | { ok: false; reason: 'missing' | 'too_large' | 'empty' | 'wrong_type' | 'not_pdf' | 'malformed' };

/**
 * Verifies an object uploaded directly by the browser before it is trusted:
 * real size from Storage metadata, stored content type, PDF signature at byte
 * 0 (blocks renamed executables, scripts and HTML) and the %%EOF trailer.
 */
export async function verifyUploadedPdf(path: string): Promise<PdfVerification> {
  assertPdfPath(path);
  const bucket = createServiceSupabase().storage.from(DOCUMENTS);

  const { data: info, error } = await bucket.info(path);
  if (error || !info) return { ok: false, reason: 'missing' };

  const size = Number(info.size ?? 0);
  if (!Number.isFinite(size) || size <= 0) return { ok: false, reason: 'empty' };
  if (size > PDF_UPLOAD.maxBytes) return { ok: false, reason: 'too_large' };
  if (info.contentType && info.contentType !== 'application/pdf') return { ok: false, reason: 'wrong_type' };

  const signedUrl = await createDocumentSignedUrl(path);
  if (!signedUrl) return { ok: false, reason: 'missing' };

  const head = await readRange(signedUrl, 'bytes=0-1023', 1024);
  if (!head || !isPdf(head)) {
    log.warn('Rejected upload: missing PDF signature', { detected: head ? detectFileKind(head) : 'unreadable' });
    return { ok: false, reason: 'not_pdf' };
  }

  const tail = await readRange(signedUrl, 'bytes=-2048', 2048);
  if (!tail || !hasPdfTrailer(tail)) return { ok: false, reason: 'malformed' };

  return { ok: true, size };
}

export async function uploadPublicImage(bucket: string, path: string, bytes: Uint8Array, contentType: string): Promise<boolean> {
  if (!isImageBucket(bucket) || !isSafeImagePath(path)) throw new Error('Refusing to use an unexpected image path');
  const { error } = await createServiceSupabase()
    .storage.from(bucket)
    .upload(path, bytes, { contentType, upsert: false, cacheControl: '31536000' });
  if (error) log.error('Image upload failed', { error: describeError(error) });
  return !error;
}

export async function removePublicImages(bucket: string, paths: string[]): Promise<boolean> {
  if (!isImageBucket(bucket)) return false;
  const safe = paths.filter(isSafeImagePath);
  if (safe.length === 0) return true;
  const { error } = await createServiceSupabase().storage.from(bucket).remove(safe);
  if (error) log.error('Could not remove images', { error: describeError(error) });
  return !error;
}
