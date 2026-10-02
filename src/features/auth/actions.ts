'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { fail, ok, type ActionResult } from '@/lib/action-result';
import { getAuth } from '@/lib/auth/auth';
import { authErrorCode } from '@/lib/auth/errors';
import { getAuthContext } from '@/lib/auth/session';
import { adminDb } from '@/lib/db/client';
import { sql } from '@/lib/db/sql';
import { createLogger } from '@/lib/logger';
import { rateLimit } from '@/lib/security/rate-limit';
import { getClientIp } from '@/lib/security/request';
import { invalidInput } from '@/lib/validation';
import { signInSchema, twoFactorSchema, type SignInInput, type TwoFactorInput } from '@/schemas/auth.schema';
import { logActivity } from '@/services/activity-log.service';
import { safeRedirectPath } from '@/utils/url';

const log = createLogger('auth');

function tooManyAttempts(retryAfterSeconds: number) {
  const minutes = Math.max(1, Math.ceil(retryAfterSeconds / 60));
  return fail(`Too many attempts. Wait ${minutes} minute${minutes === 1 ? '' : 's'} and try again.`, {
    code: 'RATE_LIMITED',
  });
}

/**
 * Step 1: e-mail + password (Better Auth, scrypt hashes). Errors are
 * deliberately generic (no account enumeration) and attempts are rate limited
 * per IP and per account. Accounts with 2FA get a short-lived challenge
 * cookie instead of a session and must pass `verifyTwoFactorAction`.
 */
export async function signInAction(input: SignInInput): Promise<ActionResult<{ twoFactor: true }>> {
  const parsed = signInSchema.safeParse(input);
  if (!parsed.success) {
    return invalidInput(parsed.error);
  }
  const { email, password, next } = parsed.data;

  const [byIp, byAccount] = await Promise.all([rateLimit('login', await getClientIp()), rateLimit('loginAccount', email)]);
  if (!byIp.success || !byAccount.success) {
    return tooManyAttempts(Math.max(byIp.retryAfterSeconds, byAccount.retryAfterSeconds));
  }

  let userId: string;
  try {
    const result = await getAuth().api.signInEmail({
      body: { email, password, rememberMe: false },
      headers: await headers(),
    });
    if ('twoFactorRedirect' in result && result.twoFactorRedirect) return ok({ twoFactor: true });
    if (!('user' in result) || !result.user) throw new Error('Sign-in returned no user');
    userId = result.user.id;
  } catch (error) {
    log.warn('Sign-in failed', { reason: authErrorCode(error) ?? 'unknown' });
    return fail('Incorrect email or password.');
  }

  // Signed in without 2FA (first sign-in): the panel sends the user to
  // /admin/security until two-factor authentication is set up.
  await logStaffSignIn(userId, 'Signed in with password');
  redirect(safeRedirectPath(next, '/admin'));
}

/** The audit log only accepts staff (RLS); accounts without a role are not logged. */
async function logStaffSignIn(userId: string, summary: string) {
  const db = adminDb(userId);
  const staff = await db
    .maybeOne(sql`select 1 from public.profiles where id = ${userId} and role is not null and is_active`)
    .catch(() => null);
  if (staff) await logActivity(db, userId, { action: 'login', entityType: 'auth', summary });
}

const TWO_FACTOR_ERRORS: Record<string, string> = {
  INVALID_CODE: 'That code is not valid. Check the time on your phone and try again.',
  INVALID_BACKUP_CODE: 'That backup code is not valid or was already used.',
  INVALID_TWO_FACTOR_COOKIE: 'Your sign-in expired. Enter your email and password again.',
  TOO_MANY_ATTEMPTS_REQUEST_NEW_CODE: 'Too many wrong codes. Enter your email and password again.',
  ACCOUNT_TEMPORARILY_LOCKED: 'Too many wrong codes. The account is locked for 15 minutes.',
};

/**
 * Step 2: the 6-digit code from the authenticator app, or a one-time backup
 * code. A failure with code UNAUTHENTICATED means the challenge is gone and
 * the password step must be repeated.
 */
export async function verifyTwoFactorAction(input: TwoFactorInput): Promise<ActionResult> {
  const parsed = twoFactorSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);
  const { code, method, next } = parsed.data;

  const limit = await rateLimit('twoFactor', await getClientIp());
  if (!limit.success) return tooManyAttempts(limit.retryAfterSeconds);

  let userId: string;
  try {
    const request = { body: { code, trustDevice: false }, headers: await headers() };
    const result =
      method === 'backup' ? await getAuth().api.verifyBackupCode(request) : await getAuth().api.verifyTOTP(request);
    userId = result.user.id;
  } catch (error) {
    const reason = authErrorCode(error) ?? 'unknown';
    log.warn('Two-factor verification failed', { reason });
    const restart = ['INVALID_TWO_FACTOR_COOKIE', 'TOO_MANY_ATTEMPTS_REQUEST_NEW_CODE'].includes(reason);
    return fail(TWO_FACTOR_ERRORS[reason] ?? 'The code could not be verified. Try again.', restart ? { code: 'UNAUTHENTICATED' } : {});
  }

  await logStaffSignIn(userId, method === 'backup' ? 'Signed in with a backup code' : 'Signed in with password and authenticator');
  redirect(safeRedirectPath(next, '/admin'));
}

export async function signOutAction(): Promise<void> {
  const context = await getAuthContext();
  if (context?.profile?.role) {
    await logActivity(adminDb(context.userId), context.userId, { action: 'logout', entityType: 'auth', summary: 'Signed out' });
  }
  try {
    await getAuth().api.signOut({ headers: await headers() });
  } catch (error) {
    log.warn('Sign-out failed', { reason: authErrorCode(error) ?? 'unknown' });
  }
  redirect('/admin/login');
}
