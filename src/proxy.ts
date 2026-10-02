import { NextResponse, type NextRequest } from 'next/server';

import { updateSession } from '@/lib/supabase/proxy';

/**
 * Runs before /admin, /preview and /api routes:
 *  1. refreshes the Supabase session cookies;
 *  2. redirects visitors without a session away from private pages early.
 *
 * This is NOT the security boundary. Pages, Server Actions and Route Handlers
 * each verify the user and role on the server (see src/lib/auth/session.ts),
 * and the database enforces RLS on every query.
 */
export async function proxy(request: NextRequest) {
  const { response, userId } = await updateSession(request);
  const { pathname, search } = request.nextUrl;

  const isPrivatePage =
    (pathname === '/admin' || pathname.startsWith('/admin/') || pathname.startsWith('/preview/')) &&
    !pathname.startsWith('/admin/login') &&
    !pathname.startsWith('/admin/auth/');

  if (isPrivatePage && !userId) {
    const loginUrl = new URL('/admin/login', request.url);
    loginUrl.searchParams.set('next', `${pathname}${search}`);
    const redirect = NextResponse.redirect(loginUrl);
    // Keep any cookie changes (e.g. a cleared, expired session).
    for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
    return redirect;
  }

  return response;
}

export const config = {
  matcher: ['/admin/:path*', '/preview/:path*', '/api/:path*'],
};
