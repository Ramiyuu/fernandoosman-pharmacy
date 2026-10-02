import type { CookieOptions } from '@supabase/ssr';

/**
 * The app never uses a Supabase client in the browser (every query runs on the
 * server), so the auth cookies can be HttpOnly: injected scripts cannot read
 * the session tokens. SameSite=Lax keeps them off cross-site POSTs, and they
 * are Secure whenever the site is served over HTTPS.
 */
export function hardenAuthCookie(options: CookieOptions = {}): CookieOptions {
  return {
    ...options,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production' && (process.env.NEXT_PUBLIC_SITE_URL ?? '').startsWith('https://'),
    path: options.path ?? '/',
  };
}
