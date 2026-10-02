import type { EmailOtpType } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';

import { createLogger } from '@/lib/logger';
import { createServerSupabase } from '@/lib/supabase/server';
import { safeRedirectPath } from '@/utils/url';

const log = createLogger('auth');
const ALLOWED_TYPES: EmailOtpType[] = ['magiclink', 'email', 'recovery', 'invite'];

/**
 * Landing point for links e-mailed by Supabase Auth. Supports the token-hash
 * template (`?token_hash=…&type=magiclink`) and the PKCE flow (`?code=…`).
 * The redirect target is restricted to internal admin paths.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const next = safeRedirectPath(searchParams.get('next'), '/admin');
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const code = searchParams.get('code');

  const supabase = await createServerSupabase();

  if (tokenHash && type && ALLOWED_TYPES.includes(type)) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(new URL(next, request.url));
    log.warn('OTP verification failed', { reason: error.code ?? 'unknown' });
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, request.url));
    log.warn('Code exchange failed', { reason: error.code ?? 'unknown' });
  }

  return NextResponse.redirect(new URL('/admin/login?error=link', request.url));
}
