import { IMAGE_BUCKETS, type ImageBucket } from '@/config/uploads';

import { isSafeImagePath } from './paths';

function storageBase(): string {
  return `${(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').replace(/\/+$/, '')}/storage/v1/object/public`;
}

/** Public URL for an object in one of the public image buckets. */
export function publicImageUrl(bucket: ImageBucket, path: string | null | undefined): string | null {
  if (!path || !isSafeImagePath(path)) return null;
  return `${storageBase()}/${bucket}/${path}`;
}

/**
 * Only images hosted in our own public image buckets may appear inside
 * article content (prevents tracking pixels and mixed content).
 */
export function isAllowedContentImageUrl(src: string): boolean {
  const base = storageBase();
  if (!src.startsWith(`${base}/`)) return false;
  const [bucket, ...rest] = src.slice(base.length + 1).split('/');
  return (Object.values(IMAGE_BUCKETS) as string[]).includes(bucket) && isSafeImagePath(rest.join('/'));
}
