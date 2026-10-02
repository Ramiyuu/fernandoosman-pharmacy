import { NextResponse, type NextRequest } from 'next/server';

import { getAuthContext } from '@/lib/auth/session';
import { roleHasPermission } from '@/lib/auth/permissions';
import { rateLimit } from '@/lib/security/rate-limit';
import { getRequestIp } from '@/lib/security/request';
import { isUuid } from '@/lib/storage/paths';
import { createPublicSupabase } from '@/lib/supabase/public';
import { createServerSupabase } from '@/lib/supabase/server';
import { createDocumentSignedUrl } from '@/services/storage.service';

export const dynamic = 'force-dynamic';

const notFound = () =>
  NextResponse.json({ error: 'File not found.' }, { status: 404, headers: { 'Cache-Control': 'no-store' } });

/**
 * GET /api/files/:id → 302 to a signed URL valid for 60 seconds.
 *
 * Authorisation is decided by RLS, not by this handler:
 *  - visitors query with the anon client, which only returns *ready, public*
 *    attachments of *published* articles (or the current CV);
 *  - staff query with their session, which returns any ready file.
 * Only after the row is visible to the caller is a signed URL created.
 * An unknown id and a forbidden id return the same 404.
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
  const isStaff = Boolean(auth?.profile?.isActive && roleHasPermission(auth.profile.role, 'admin:access'));
  const supabase = isStaff ? await createServerSupabase() : createPublicSupabase();

  const { data: file } = await supabase
    .from('article_files')
    .select('storage_path, original_filename, status')
    .eq('id', id)
    .eq('status', 'ready')
    .maybeSingle();
  if (!file) return notFound();

  const download = request.nextUrl.searchParams.get('download') === '1';
  const signedUrl = await createDocumentSignedUrl(file.storage_path, download ? file.original_filename : undefined);
  if (!signedUrl) {
    return NextResponse.json({ error: 'The file is temporarily unavailable.' }, { status: 503 });
  }

  return NextResponse.redirect(signedUrl, { status: 302, headers: { 'Cache-Control': 'private, no-store' } });
}
