/**
 * Upload policy — the single place to change limits and accepted types.
 *
 * The PDF limit must match the `documents` bucket `file_size_limit`
 * (supabase/migrations/*_storage.sql); the bucket enforces it again on the
 * storage side.
 */

const MB = 1024 * 1024;

function readMegabytes(value: string | undefined, fallback: number, max: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, max);
}

export const PDF_UPLOAD = {
  maxBytes: readMegabytes(process.env.PDF_MAX_SIZE_MB, 30, 100) * MB,
  mimeTypes: ['application/pdf'] as const,
  extensions: ['pdf'] as const,
  bucket: 'documents',
  /** Seconds a signed download URL stays valid. Never stored. */
  signedUrlTtlSeconds: 60,
} as const;

export const IMAGE_UPLOAD = {
  // Images are proxied through a Route Handler; keep below the 4.5 MB
  // request-body limit of serverless platforms such as Vercel.
  maxBytes: readMegabytes(process.env.IMAGE_MAX_SIZE_MB, 4, 4.4) * MB,
  maxDimension: 8000,
  mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'] as const,
  extensions: ['jpg', 'jpeg', 'png', 'webp', 'avif', 'gif'] as const,
} as const;

export type ImageMimeType = (typeof IMAGE_UPLOAD.mimeTypes)[number];

export const IMAGE_BUCKETS = {
  article: 'article-images',
  profile: 'profile-images',
  project: 'project-images',
} as const;

export type ImageBucketKey = keyof typeof IMAGE_BUCKETS;
export type ImageBucket = (typeof IMAGE_BUCKETS)[ImageBucketKey];

/** Folder (first path segment) used inside each image bucket. */
export const IMAGE_FOLDERS: Record<ImageBucketKey, string> = {
  article: 'articles',
  profile: 'profile',
  project: 'projects',
};
