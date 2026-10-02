import { publicDb } from '@/lib/db/client';
import { sql } from '@/lib/db/sql';
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    await publicDb().one(sql`select id from public.site_profile where id = 1`);
    return Response.json({ status: 'ok' }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json({ status: 'unavailable' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
