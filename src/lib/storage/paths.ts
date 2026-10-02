import { IMAGE_BUCKETS, IMAGE_FOLDERS, type ImageBucket, type ImageBucketKey } from '@/config/uploads';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const PDF_PATH = /^(articles\/[0-9a-f-]{36}|cv|resources)\/[0-9a-f-]{36}\.pdf$/;
const IMAGE_PATH = /^(articles|profile|projects)\/[0-9a-f-]{36}\.(jpg|png|webp|avif|gif)$/;

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID.test(value);
}

/**
 * Storage paths are always generated here from random UUIDs. User-supplied
 * names never reach a path, which rules out path traversal and overwrites.
 */
export function createPdfObjectPath(scope: { kind: 'article'; articleId: string } | { kind: 'cv' | 'resource' }) {
  if (scope.kind === 'article' && !isUuid(scope.articleId)) {
    throw new Error('Invalid article id for storage path');
  }
  const internalName = `${crypto.randomUUID()}.pdf`;
  const folder = scope.kind === 'article' ? `articles/${scope.articleId}` : scope.kind === 'cv' ? 'cv' : 'resources';
  return { internalName, path: `${folder}/${internalName}` };
}

export function createImageObjectPath(bucketKey: ImageBucketKey, extension: string) {
  const path = `${IMAGE_FOLDERS[bucketKey]}/${crypto.randomUUID()}.${extension}`;
  return { bucket: IMAGE_BUCKETS[bucketKey], path };
}

export function isSafePdfPath(path: string): boolean {
  return PDF_PATH.test(path) && !path.includes('..');
}

export function isSafeImagePath(path: string): boolean {
  return IMAGE_PATH.test(path) && !path.includes('..');
}

/** Key of an object inside the R2 bucket: <logical bucket>/<path>. */
export function objectKey(bucket: 'documents' | ImageBucket, path: string): string {
  const safe = bucket === 'documents' ? isSafePdfPath(path) : isImageBucket(bucket) && isSafeImagePath(path);
  if (!safe) throw new Error('Refusing to use an unexpected storage path');
  return `${bucket}/${path}`;
}

export function isImageBucket(value: string): value is ImageBucket {
  return (Object.values(IMAGE_BUCKETS) as string[]).includes(value);
}
