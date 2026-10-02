'use server';

import { headers } from 'next/headers';
import QRCode from 'qrcode';

import { fail, ok, type ActionResult } from '@/lib/action-result';
import { guardAction } from '@/lib/auth/action-guard';
import { getAuth } from '@/lib/auth/auth';
import { authErrorCode } from '@/lib/auth/errors';
import { createLogger } from '@/lib/logger';
import { rateLimit } from '@/lib/security/rate-limit';
import { invalidInput } from '@/lib/validation';
import {
  changePasswordSchema,
  passwordConfirmationSchema,
  totpCodeSchema,
  type ChangePasswordInput,
  type PasswordConfirmationInput,
  type TotpCodeInput,
} from '@/schemas/auth.schema';
import { logActivity } from '@/services/activity-log.service';

const log = createLogger('security');

const AUTH_ERRORS: Record<string, string> = {
  INVALID_PASSWORD: 'The password is not correct.',
  INVALID_EMAIL_OR_PASSWORD: 'The password is not correct.',
  INVALID_CODE: 'That code is not valid. Check the time on your phone and try again.',
  TOTP_ALREADY_ENABLED: 'Two-factor authentication is already on.',
  SESSION_NOT_FRESH: 'For your safety, sign out and sign in again, then retry within 15 minutes.',
  PASSWORD_TOO_SHORT: 'Use at least 12 characters.',
  PASSWORD_TOO_LONG: 'Use at most 128 characters.',
};

function authFailure(operation: string, error: unknown) {
  const reason = authErrorCode(error) ?? 'unknown';
  log.warn(`${operation} failed`, { reason });
  return fail(AUTH_ERRORS[reason] ?? 'The change could not be made. Try again.');
}

async function limitedFor(userId: string) {
  const limit = await rateLimit('twoFactor', userId);
  return limit.success ? null : fail('Too many attempts. Wait a few minutes and try again.', { code: 'RATE_LIMITED' });
}

export interface TwoFactorSetup {
  /** QR code as an SVG data URL (rendered with <img>, never injected as HTML). */
  qrCode: string;
  /** The secret in Base32, for typing into the app by hand. */
  secret: string;
  backupCodes: string[];
}

/**
 * Step 1 of 2FA setup: confirms the password and creates a TOTP secret (stored
 * encrypted, not active yet). Allowed before 2FA is on: it is how it gets on.
 */
export async function startTwoFactorSetupAction(input: PasswordConfirmationInput): Promise<ActionResult<TwoFactorSetup>> {
  const guard = await guardAction('admin:access', { allowWithoutTwoFactor: true });
  if (!guard.ok) return guard;
  if (guard.session.twoFactorEnabled) return fail('Two-factor authentication is already on.');
  const limited = await limitedFor(guard.session.userId);
  if (limited) return limited;

  const parsed = passwordConfirmationSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);

  try {
    const result = await getAuth().api.enableTwoFactor({ body: { password: parsed.data.password }, headers: await headers() });
    if (!('totpURI' in result) || !result.totpURI) return fail('The setup could not be started. Try again.');
    const secret = new URL(result.totpURI).searchParams.get('secret') ?? '';
    const svg = await QRCode.toString(result.totpURI, { type: 'svg', margin: 1, errorCorrectionLevel: 'M' });
    return ok({
      qrCode: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
      secret,
      backupCodes: result.backupCodes ?? [],
    });
  } catch (error) {
    return authFailure('2FA setup', error);
  }
}

/** Step 2: a code from the app proves it was set up correctly; 2FA is then required at every sign-in. */
export async function confirmTwoFactorSetupAction(input: TotpCodeInput): Promise<ActionResult> {
  const guard = await guardAction('admin:access', { allowWithoutTwoFactor: true });
  if (!guard.ok) return guard;
  const limited = await limitedFor(guard.session.userId);
  if (limited) return limited;

  const parsed = totpCodeSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);

  try {
    await getAuth().api.verifyTOTP({ body: { code: parsed.data.code, trustDevice: false }, headers: await headers() });
  } catch (error) {
    return authFailure('2FA confirmation', error);
  }

  await logActivity(guard.session.db, guard.session.userId, {
    action: 'two_factor_enabled',
    entityType: 'auth',
    summary: 'Turned on two-factor authentication',
  });
  return ok(undefined, 'Two-factor authentication is on.');
}

export async function regenerateBackupCodesAction(input: PasswordConfirmationInput): Promise<ActionResult<{ backupCodes: string[] }>> {
  const guard = await guardAction('admin:access');
  if (!guard.ok) return guard;
  const limited = await limitedFor(guard.session.userId);
  if (limited) return limited;

  const parsed = passwordConfirmationSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);

  let backupCodes: string[];
  try {
    const result = await getAuth().api.generateBackupCodes({ body: { password: parsed.data.password }, headers: await headers() });
    backupCodes = result.backupCodes;
  } catch (error) {
    return authFailure('Backup code generation', error);
  }

  await logActivity(guard.session.db, guard.session.userId, {
    action: 'backup_codes_regenerated',
    entityType: 'auth',
    summary: 'Generated new backup codes',
  });
  return ok({ backupCodes }, 'New backup codes generated. The old ones no longer work.');
}

export async function changePasswordAction(input: ChangePasswordInput): Promise<ActionResult> {
  const guard = await guardAction('admin:access');
  if (!guard.ok) return guard;
  const limited = await limitedFor(guard.session.userId);
  if (limited) return limited;

  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);

  try {
    await getAuth().api.changePassword({
      body: { currentPassword: parsed.data.currentPassword, newPassword: parsed.data.newPassword, revokeOtherSessions: true },
      headers: await headers(),
    });
  } catch (error) {
    return authFailure('Password change', error);
  }

  await logActivity(guard.session.db, guard.session.userId, {
    action: 'password_changed',
    entityType: 'auth',
    summary: 'Changed password and signed out other devices',
  });
  return ok(undefined, 'Password changed. Other devices were signed out.');
}

export async function signOutOtherSessionsAction(): Promise<ActionResult> {
  const guard = await guardAction('admin:access');
  if (!guard.ok) return guard;

  try {
    await getAuth().api.revokeOtherSessions({ headers: await headers() });
  } catch (error) {
    return authFailure('Revoking sessions', error);
  }

  await logActivity(guard.session.db, guard.session.userId, {
    action: 'sessions_revoked',
    entityType: 'auth',
    summary: 'Signed out other devices',
  });
  return ok(undefined, 'Other devices were signed out.');
}
