import { getSessionCookie } from 'better-auth/cookies';
import { NextResponse, type NextRequest } from 'next/server';

import { AUTH_COOKIE_PREFIX } from '@/lib/auth/constants';

/**
 * Runs before /admin and /preview: visitors without a session cookie are sent
 * to the sign-in page early, with the page they wanted in ?next=.
 *
 * This is NOT the security boundary — it only looks at whether a cookie
 * exists. Every page, Server Action and Route Handler verifies the session
 * against the database, the role and the 2FA requirement on the server (see
 * src/lib/auth/session.ts), and the database enforces RLS on every query.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (pathname === '/admin/login' || pathname.startsWith('/admin/login/')) return NextResponse.next();

  if (!getSessionCookie(request, { cookiePrefix: AUTH_COOKIE_PREFIX })) {
    const loginUrl = new URL('/admin/login', request.url);
    loginUrl.searchParams.set('next', `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/preview/:path*'],
};
