import { randomUUID } from 'node:crypto';
import { recordEvent } from '@/services/analytics.service';
import { NextResponse, type NextRequest } from 'next/server';

import { roleHasPermission } from '@/lib/auth/permissions';
import { getAuthContext } from '@/lib/auth/session';
import { adminDb, publicDb } from '@/lib/db/client';
import { sql } from '@/lib/db/sql';
import { createLogger, describeError } from '@/lib/logger';
import { rateLimit } from '@/lib/security/rate-limit';
import { getRequestIp } from '@/lib/security/request';
import { isUuid } from '@/lib/storage/paths';
import { createDocumentSignedUrl } from '@/services/storage.service';

export const dynamic = 'force-dynamic';

const log = createLogger('files');

const notFound = () =>
  NextResponse.json({ error: 'File not found.' }, { status: 404, headers: { 'Cache-Control': 'no-store' } });

/**
 * GET /api/files/:id[?download=1] → 302 to a signed URL valid for 60 seconds.
 *
 * Authorisation is decided by RLS, not by this handler:
 *  - visitors query as web_anon, which only sees *ready, public* attachments
 *    of *published* articles (or the current CV);
 *  - signed-in staff (with 2FA) query as web_admin and see any ready file.
 * Only after the row is visible to the caller is a signed URL created. An
 * unknown id and a forbidden id return the same 404.
 */
export async function GET(request: NextRequest, context: RouteContext<'/api/files/[id]'>) {
  const { id } = await context.params;
  if (!isUuid(id)) return notFound();

  const limit = await rateLimit('fileDownload', getRequestIp(request));
  if (!limit.success) {
    return NextResponse.json(
      { error: 'Too many requests.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } },
    );
  }

  const auth = await getAuthContext();
  const isStaff = Boolean(
    auth?.twoFactorEnabled && auth.profile?.isActive && roleHasPermission(auth.profile.role, 'admin:access'),
  );
  const db = isStaff && auth ? adminDb(auth.userId) : publicDb();

  let file: {
    storage_path: string;
    original_filename: string;
    article_id: string | null;
    project_id: string | null;
  } | null;
  try {
    file = await db.maybeOne(sql`
      select storage_path, original_filename, article_id, project_id from public.article_files where id = ${id} and status = 'ready'`);
  } catch (error) {
    log.error('File lookup failed', { error: describeError(error) });
    return NextResponse.json({ error: 'The file is temporarily unavailable.' }, { status: 503 });
  }
  if (!file) return notFound();

  const download = request.nextUrl.searchParams.get('download') === '1';
  const signedUrl = await createDocumentSignedUrl(file.storage_path, download ? file.original_filename : undefined);
  if (!signedUrl) {
    return NextResponse.json({ error: 'The file is temporarily unavailable.' }, { status: 503 });
  }

  const response = NextResponse.redirect(signedUrl, { status: 302, headers: { 'Cache-Control': 'private, no-store' } });
  if (!isStaff && request.headers.get('dnt') !== '1') {
    const existing = request.cookies.get('fo-file-session')?.value;
    const session = existing && isUuid(existing) ? existing : randomUUID();
    await recordEvent(download ? 'file_download' : 'file_view', id, session, {
      articleId: file.article_id,
      projectId: file.project_id,
    });
    response.cookies.set('fo-file-session', session, {
      httpOnly: true,
      sameSite: 'lax',
      secure: request.nextUrl.protocol === 'https:',
      maxAge: 86400,
      path: '/api',
    });
  }
  return response;
}
