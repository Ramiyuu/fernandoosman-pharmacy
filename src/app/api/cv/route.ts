import { NextResponse, type NextRequest } from 'next/server';

import { rateLimit } from '@/lib/security/rate-limit';
import { getRequestIp } from '@/lib/security/request';
import { getPublicCvFile } from '@/services/public-content.service';
import { createDocumentSignedUrl } from '@/services/storage.service';

export const dynamic = 'force-dynamic';

/** GET /api/cv[?download=1] → 302 to a short-lived signed URL for the current CV PDF. */
export async function GET(request: NextRequest) {
  const limit = await rateLimit('fileDownload', getRequestIp(request));
  if (!limit.success) {
    return NextResponse.json({ error: 'Too many requests.' }, { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } });
  }

  const file = await getPublicCvFile();
  if (!file) return NextResponse.json({ error: 'No CV has been published yet.' }, { status: 404 });

  const download = request.nextUrl.searchParams.get('download') === '1';
  const signedUrl = await createDocumentSignedUrl(file.storage_path, download ? file.original_filename : undefined);
  if (!signedUrl) return NextResponse.json({ error: 'The CV is temporarily unavailable.' }, { status: 503 });

  return NextResponse.redirect(signedUrl, { status: 302, headers: { 'Cache-Control': 'private, no-store' } });
}
