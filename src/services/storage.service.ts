import 'server-only';

import { PDF_UPLOAD, type ImageBucket } from '@/config/uploads';
import { createLogger, describeError } from '@/lib/logger';
import { objectKey } from '@/lib/storage/paths';
import { contentDisposition, deleteObject, presignGetUrl, putObject } from '@/lib/storage/r2';

/**
 * All object storage access goes through here. Callers MUST authorise the
 * request first: these helpers use the server's R2 credentials.
 */

const log = createLogger('storage');
const DOCUMENTS = 'documents' as const;

/**
 * Short-lived signed URL for a stored PDF (60 s). Never persist the result.
 * `downloadName` makes the browser save the file instead of displaying it.
 */
export async function createDocumentSignedUrl(path: string, downloadName?: string): Promise<string | null> {
  try {
    return await presignGetUrl(objectKey(DOCUMENTS, path), {
      expiresInSeconds: PDF_UPLOAD.signedUrlTtlSeconds,
      contentType: 'application/pdf',
      disposition: downloadName ? contentDisposition('attachment', downloadName) : 'inline',
    });
  } catch (error) {
    log.error('Could not sign document URL', { error: describeError(error) });
    return null;
  }
}

export async function storeDocument(path: string, bytes: Uint8Array): Promise<boolean> {
  try {
    await putObject(objectKey(DOCUMENTS, path), bytes, { contentType: 'application/pdf', cacheControl: 'private, no-store' });
    return true;
  } catch (error) {
    log.error('Document upload failed', { error: describeError(error) });
    return false;
  }
}

async function removeAll(keys: string[], label: string): Promise<boolean> {
  const results = await Promise.allSettled(keys.map((key) => deleteObject(key)));
  const failed = results.filter((result) => result.status === 'rejected');
  if (failed.length > 0) {
    log.error(`Could not remove ${label}`, { failed: failed.length, error: describeError((failed[0] as PromiseRejectedResult).reason) });
  }
  return failed.length === 0;
}

export async function removeDocuments(paths: string[]): Promise<boolean> {
  const keys: string[] = [];
  for (const path of paths) {
    try {
      keys.push(objectKey(DOCUMENTS, path));
    } catch {
      log.warn('Skipped an unexpected document path');
    }
  }
  return removeAll(keys, 'documents');
}

export async function storeImage(bucket: ImageBucket, path: string, bytes: Uint8Array, contentType: string): Promise<boolean> {
  try {
    // Object names are random and never reused, so images can be cached forever.
    await putObject(objectKey(bucket, path), bytes, { contentType, cacheControl: 'public, max-age=31536000, immutable' });
    return true;
  } catch (error) {
    log.error('Image upload failed', { error: describeError(error) });
    return false;
  }
}

export async function removeImages(bucket: ImageBucket, paths: string[]): Promise<boolean> {
  const keys: string[] = [];
  for (const path of paths) {
    try {
      keys.push(objectKey(bucket, path));
    } catch {
      log.warn('Skipped an unexpected image path');
    }
  }
  return removeAll(keys, 'images');
}
