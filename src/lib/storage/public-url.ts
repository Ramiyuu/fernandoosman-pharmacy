import { IMAGE_BUCKETS, type ImageBucket } from '@/config/uploads';

import { isSafeImagePath } from './paths';

/** Images are served by the site itself (src/app/media/[...key]/route.ts) from the private bucket. */
export const MEDIA_PREFIX = '/media';

/** Site-relative URL of an uploaded image, or null if the path is not one we generated. */
export function publicImageUrl(bucket: ImageBucket, path: string | null | undefined): string | null {
  if (!path || !isSafeImagePath(path)) return null;
  return `${MEDIA_PREFIX}/${bucket}/${path}`;
}

/**
 * Only images uploaded through the admin may appear inside article content
 * (prevents tracking pixels, hot-linking and mixed content).
 */
export function isAllowedContentImageUrl(src: string): boolean {
  if (!src.startsWith(`${MEDIA_PREFIX}/`)) return false;
  const [bucket, ...rest] = src.slice(MEDIA_PREFIX.length + 1).split('/');
  return (Object.values(IMAGE_BUCKETS) as string[]).includes(bucket) && isSafeImagePath(rest.join('/'));
}
