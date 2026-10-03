import { getSessionCookie } from 'better-auth/cookies';
import { NextResponse, type NextRequest } from 'next/server';

import { AUTH_COOKIE_PREFIX } from '@/lib/auth/constants';
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, LOCALE_HEADER, negotiateLocale } from '@/i18n/config';
import { internalPathFromUnprefixed, localizePath, resolvePublicPath } from '@/i18n/routing';

/**
 * Admin and preview: visitors without a session cookie are sent to the
 * sign-in page early, with the page they wanted in ?next=.
 *
 * This is NOT the security boundary — it only looks at whether a cookie
 * exists. Every page, Server Action and Route Handler verifies the session
 * against the database, the role and the 2FA requirement on the server (see
 * src/lib/auth/session.ts), and the database enforces RLS on every query.
 */
function guardAdmin(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (pathname === '/admin/login' || pathname.startsWith('/admin/login/')) return NextResponse.next();

  if (!getSessionCookie(request, { cookiePrefix: AUTH_COOKIE_PREFIX })) {
    const loginUrl = new URL('/admin/login', request.url);
    loginUrl.searchParams.set('next', `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

/**
 * Public pages live under /en and /pt. Portuguese URLs use Portuguese
 * segments (/pt/artigos) and are rewritten onto the route folders; any other
 * spelling redirects to the canonical one. Unprefixed URLs (/, old links)
 * redirect to the visitor's language: the switcher's cookie first, then the
 * browser's Accept-Language, then English.
 */
function routeLocale(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const resolved = resolvePublicPath(pathname);

  if (resolved) {
    // Metadata images are referenced by their route path (/pt/articles/x/opengraph-image):
    // serve them as-is instead of redirecting crawlers.
    if (resolved.canonical !== pathname && !pathname.includes('/opengraph-image')) {
      return NextResponse.redirect(new URL(`${resolved.canonical}${search}`, request.url), 308);
    }
    const headers = new Headers(request.headers);
    headers.set(LOCALE_HEADER, resolved.locale);
    if (resolved.internal !== pathname) {
      return NextResponse.rewrite(new URL(`${resolved.internal}${search}`, request.url), { request: { headers } });
    }
    return NextResponse.next({ request: { headers } });
  }

  const saved = request.cookies.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(saved) ? saved : (negotiateLocale(request.headers.get('accept-language')) ?? DEFAULT_LOCALE);
  const response = NextResponse.redirect(
    new URL(`${localizePath(locale, internalPathFromUnprefixed(pathname))}${search}`, request.url),
    307,
  );
  response.headers.set('Vary', 'Accept-Language, Cookie');
  return response;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === '/admin' || pathname.startsWith('/admin/') || pathname === '/preview' || pathname.startsWith('/preview/')) {
    return guardAdmin(request);
  }
  return routeLocale(request);
}

export const config = {
  // Everything except Next internals (including dev overlay endpoints), API
  // and media routes, and files with an extension (robots.txt, sitemap.xml,
  // rss.xml, icons, /brand images…).
  matcher: ['/((?!_next/|__next|api/|media/|.*\\.[A-Za-z0-9]+$).*)'],
};
