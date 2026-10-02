'use server';

import { redirect } from 'next/navigation';

import { fail, ok, type ActionResult } from '@/lib/action-result';
import { invalidInput } from '@/lib/validation';
import { isMagicLinkEnabled } from '@/lib/env';
import { createLogger } from '@/lib/logger';
import { siteUrl } from '@/lib/public-env';
import { hashIdentifier, rateLimit } from '@/lib/security/rate-limit';
import { getClientIp } from '@/lib/security/request';
import { createServerSupabase } from '@/lib/supabase/server';
import { magicLinkSchema, signInSchema, type MagicLinkInput, type SignInInput } from '@/schemas/auth.schema';
import { logActivity } from '@/services/activity-log.service';
import { safeRedirectPath } from '@/utils/url';

const log = createLogger('auth');

function tooManyAttempts(retryAfterSeconds: number) {
  const minutes = Math.max(1, Math.ceil(retryAfterSeconds / 60));
  return fail(`Too many sign-in attempts. Wait ${minutes} minute${minutes === 1 ? '' : 's'} and try again.`, {
    code: 'RATE_LIMITED',
  });
}

/**
 * Email + password sign-in through Supabase Auth. Errors are deliberately
 * generic (no account enumeration) and attempts are rate limited per IP and
 * per account.
 */
export async function signInAction(input: SignInInput): Promise<ActionResult> {
  const parsed = signInSchema.safeParse(input);
  if (!parsed.success) {
    return invalidInput(parsed.error);
  }
  const { email, password, next } = parsed.data;

  const [byIp, byAccount] = await Promise.all([
    rateLimit('login', await getClientIp()),
    rateLimit('loginAccount', hashIdentifier(email)),
  ]);
  if (!byIp.success || !byAccount.success) {
    return tooManyAttempts(Math.max(byIp.retryAfterSeconds, byAccount.retryAfterSeconds));
  }

  const supabase = await createServerSupabase();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    log.warn('Sign-in failed', { reason: error?.code ?? 'unknown' });
    return fail('Incorrect email or password.');
  }

  await logActivity(supabase, data.user.id, { action: 'login', entityType: 'auth', summary: 'Signed in with password' });
  redirect(safeRedirectPath(next, '/admin'));
}

/** Sends a one-time sign-in link to existing accounts only (never creates users). */
export async function sendMagicLinkAction(input: MagicLinkInput): Promise<ActionResult> {
  if (!isMagicLinkEnabled()) return fail('Email sign-in links are disabled.');

  const parsed = magicLinkSchema.safeParse(input);
  if (!parsed.success) {
    return invalidInput(parsed.error);
  }

  const [byIp, byAccount] = await Promise.all([
    rateLimit('magicLink', await getClientIp()),
    rateLimit('magicLink', hashIdentifier(parsed.data.email)),
  ]);
  if (!byIp.success || !byAccount.success) {
    return tooManyAttempts(Math.max(byIp.retryAfterSeconds, byAccount.retryAfterSeconds));
  }

  const supabase = await createServerSupabase();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: { shouldCreateUser: false, emailRedirectTo: `${siteUrl()}/admin/auth/confirm?next=/admin` },
  });
  if (error) log.warn('Magic link request failed', { reason: error.code ?? 'unknown' });

  // Same answer whether or not the account exists.
  return ok(undefined, 'If an account exists for this address, a sign-in link is on its way.');
}

export async function signOutAction(): Promise<void> {
  const supabase = await createServerSupabase();
  const { data } = await supabase.auth.getUser();
  if (data.user) {
    await logActivity(supabase, data.user.id, { action: 'logout', entityType: 'auth', summary: 'Signed out' });
  }
  await supabase.auth.signOut();
  redirect('/admin/login');
}
