import { NextRequest, NextResponse } from 'next/server';
import { authorizeAdmin } from '@/lib/auth/session';
import { publicDb } from '@/lib/db/client';
import { sql } from '@/lib/db/sql';
import { isUuid } from '@/lib/storage/paths';
import { presignGetUrl } from '@/lib/storage/r2';
export async function GET(_request: NextRequest, context: RouteContext<'/api/videos/[id]'>) {
  const { id } = await context.params;
  if (!isUuid(id)) return new NextResponse(null, { status: 404 });
  const auth = await authorizeAdmin('files:write');
  const db = auth.ok ? auth.session.db : publicDb();
  const video = await db.maybeOne<{ storage_key: string; mime_type: string }>(
    sql`select storage_key, mime_type from public.videos where id = ${id} and ready`,
  );
  if (!video) return new NextResponse(null, { status: 404 });
  return NextResponse.redirect(
    await presignGetUrl(video.storage_key, {
      expiresInSeconds: 300,
      contentType: video.mime_type,
      disposition: 'inline',
    }),
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}
