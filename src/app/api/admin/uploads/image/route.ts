import { imageSize } from 'image-size';
import { NextResponse, type NextRequest } from 'next/server';

import { IMAGE_BUCKETS, IMAGE_UPLOAD, type ImageBucketKey } from '@/config/uploads';
import { authorizeAdmin } from '@/lib/auth/session';
import { createLogger, describeError } from '@/lib/logger';
import { detectFileKind, detectImageMime, IMAGE_EXTENSION_BY_MIME } from '@/lib/security/file-signature';
import { rateLimit } from '@/lib/security/rate-limit';
import { isSameOriginRequest } from '@/lib/security/request';
import { createImageObjectPath } from '@/lib/storage/paths';
import { publicImageUrl } from '@/lib/storage/public-url';
import { logActivity } from '@/services/activity-log.service';
import { removePublicImages, uploadPublicImage } from '@/services/storage.service';
import { formatBytes } from '@/utils/format';
import { getExtension, hasBlockedExtension, sanitizeDisplayFilename } from '@/utils/filename';

export const dynamic = 'force-dynamic';

const log = createLogger('image-upload');

const error = (message: string, status: number) =>
  NextResponse.json({ error: message }, { status, headers: { 'Cache-Control': 'no-store' } });

/**
 * POST /api/admin/uploads/image?bucket=article|project|profile
 * multipart/form-data with a single `file` field.
 *
 * Checks, in order: same-origin (CSRF), admin session, rate limit, declared
 * size, extension, declared MIME, actual bytes (magic number + full header
 * parse), dimensions. The stored content type comes from the bytes, and the
 * object name is a random UUID.
 */
export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) return error('Cross-site request blocked.', 403);

  const auth = await authorizeAdmin('files:write');
  if (!auth.ok) return error(auth.error, auth.status);
  const { supabase, userId } = auth.session;

  const limit = await rateLimit('upload', userId);
  if (!limit.success) return error('Too many uploads in a short time. Wait a few minutes.', 429);

  const bucketKey = request.nextUrl.searchParams.get('bucket') as ImageBucketKey | null;
  if (!bucketKey || !(bucketKey in IMAGE_BUCKETS)) return error('Unknown image destination.', 400);

  const declaredLength = Number(request.headers.get('content-length') ?? 0);
  if (declaredLength > IMAGE_UPLOAD.maxBytes + 64 * 1024) {
    return error(`Images must be smaller than ${formatBytes(IMAGE_UPLOAD.maxBytes)}.`, 413);
  }

  let file: File;
  try {
    const form = await request.formData();
    const value = form.get('file');
    if (!(value instanceof File)) return error('No file was sent.', 400);
    file = value;
  } catch {
    return error('The upload could not be read.', 400);
  }

  if (file.size === 0) return error('The file is empty.', 400);
  if (file.size > IMAGE_UPLOAD.maxBytes) return error(`Images must be smaller than ${formatBytes(IMAGE_UPLOAD.maxBytes)}.`, 413);

  const displayName = sanitizeDisplayFilename(file.name, 'image');
  const extension = getExtension(displayName);
  if (hasBlockedExtension(file.name) || !(IMAGE_UPLOAD.extensions as readonly string[]).includes(extension)) {
    return error('Use a JPG, PNG, WebP, AVIF or GIF image. SVG is not accepted.', 415);
  }
  if (!(IMAGE_UPLOAD.mimeTypes as readonly string[]).includes(file.type)) {
    return error('Use a JPG, PNG, WebP, AVIF or GIF image.', 415);
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const detectedMime = detectImageMime(bytes);
  if (!detectedMime) {
    log.warn('Rejected image upload: signature mismatch', { detected: detectFileKind(bytes) });
    return error('This file is not a valid image.', 415);
  }

  let dimensions: { width: number; height: number };
  try {
    const result = imageSize(bytes);
    if (!result.width || !result.height) throw new Error('missing dimensions');
    dimensions = { width: result.width, height: result.height };
  } catch {
    return error('This image could not be read.', 415);
  }
  if (dimensions.width > IMAGE_UPLOAD.maxDimension || dimensions.height > IMAGE_UPLOAD.maxDimension) {
    return error(`Images can be at most ${IMAGE_UPLOAD.maxDimension}px on each side.`, 413);
  }

  const { bucket, path } = createImageObjectPath(bucketKey, IMAGE_EXTENSION_BY_MIME[detectedMime]);
  const uploaded = await uploadPublicImage(bucket, path, bytes, detectedMime);
  if (!uploaded) return error('The image could not be stored. Try again.', 502);

  const { data: row, error: insertError } = await supabase
    .from('media_files')
    .insert({
      bucket,
      storage_path: path,
      original_filename: displayName,
      mime_type: detectedMime,
      size_bytes: bytes.byteLength,
      width: dimensions.width,
      height: dimensions.height,
      uploaded_by: userId,
    })
    .select('id')
    .single();
  if (insertError || !row) {
    log.error('Could not record image', { error: describeError(insertError) });
    await removePublicImages(bucket, [path]);
    return error('The image could not be saved. Try again.', 500);
  }

  await logActivity(supabase, userId, { action: 'image_uploaded', entityType: 'image', entityId: row.id, summary: displayName });

  return NextResponse.json(
    { id: row.id, bucket, path, url: publicImageUrl(bucket, path), width: dimensions.width, height: dimensions.height },
    { status: 201, headers: { 'Cache-Control': 'no-store' } },
  );
}
