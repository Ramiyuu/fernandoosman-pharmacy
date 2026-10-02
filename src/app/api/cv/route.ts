import { NextResponse, type NextRequest } from 'next/server';
import { getSiteProfile } from '@/services/public-content.service';
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  const profile = await getSiteProfile();
  if (!profile?.cv_file_id) return NextResponse.json({ error: 'No CV published.' }, { status: 404 });
  return NextResponse.redirect(
    new URL(
      `/api/files/${profile.cv_file_id}${request.nextUrl.searchParams.get('download') === '1' ? '?download=1' : ''}`,
      request.url,
    ),
    { status: 302, headers: { 'Cache-Control': 'private, no-store' } },
  );
}
