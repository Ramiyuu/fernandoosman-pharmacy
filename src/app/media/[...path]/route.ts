import { NextResponse, type NextRequest } from 'next/server';

import { IMAGE_UPLOAD } from '@/config/uploads';
import { createLogger, describeError } from '@/lib/logger';
import { isImageBucket, isSafeImagePath, objectKey } from '@/lib/storage/paths';
import { getObject } from '@/lib/storage/r2';

export const dynamic = 'force-dynamic';

const log = createLogger('media');

const CONTENT_TYPES: Record<string, (typeof IMAGE_UPLOAD.mimeTypes)[number]> = {
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  avif: 'image/avif',
  gif: 'image/gif',
};

const notFound = () => new NextResponse('Not found', { status: 404, headers: { 'Cache-Control': 'public, max-age=60' } });

/**
 * GET /media/<bucket>/<path> — serves uploaded images from the private R2
 * bucket. Only paths the server itself generated (random UUID names, raster
 * image extensions) are accepted, so this cannot be used to read PDFs or
 * anything else in the bucket. Object names are never reused, so responses
 * are cacheable forever by browsers and CDNs.
 */
export async function GET(request: NextRequest, context: RouteContext<'/media/[...path]'>) {
  const { path: segments } = await context.params;
  const [bucket, ...rest] = segments;
  const path = rest.join('/');
  if (!bucket || !isImageBucket(bucket) || !isSafeImagePath(path)) return notFound();

  const contentType = CONTENT_TYPES[path.slice(path.lastIndexOf('.') + 1)];
  if (!contentType) return notFound();

  let object: Response | null;
  try {
    object = await getObject(objectKey(bucket, path), { ifNoneMatch: request.headers.get('if-none-match') });
  } catch (error) {
    log.error('Image read failed', { error: describeError(error) });
    return new NextResponse('Temporarily unavailable', { status: 503, headers: { 'Retry-After': '30' } });
  }
  if (!object) return notFound();

  const headers = new Headers({
    'Content-Type': contentType,
    'Cache-Control': 'public, max-age=31536000, immutable',
    'X-Content-Type-Options': 'nosniff',
  });
  const etag = object.headers.get('etag');
  if (etag) headers.set('ETag', etag);

  if (object.status === 304) return new NextResponse(null, { status: 304, headers });
  const length = object.headers.get('content-length');
  if (length) headers.set('Content-Length', length);
  return new NextResponse(object.body, { status: 200, headers });
}
