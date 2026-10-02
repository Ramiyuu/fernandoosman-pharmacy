import 'server-only';

import { headers } from 'next/headers';
import { forbidden, redirect } from 'next/navigation';
import { cache } from 'react';

import { adminDb, type Db } from '@/lib/db/client';
import { sql } from '@/lib/db/sql';
import { createLogger, describeError } from '@/lib/logger';
import type { AppRole } from '@/types/database.types';

import { getAuth } from './auth';
import { roleHasPermission, type Permission } from './permissions';

const log = createLogger('auth');

export const SECURITY_SETUP_PATH = '/admin/security';

export interface StaffProfile {
  id: string;
  email: string | null;
  displayName: string;
  role: AppRole | null;
  isActive: boolean;
}

export interface AuthContext {
  userId: string;
  email: string | null;
  twoFactorEnabled: boolean;
  profile: StaffProfile | null;
}

export interface AdminSession extends AuthContext {
  profile: StaffProfile & { role: AppRole };
  /** Database access as web_admin, bound to this verified profile (RLS applies). */
  db: Db;
}

/**
 * Resolves the signed-in user for this request (memoised per request).
 * Identity comes only from the Better Auth session (cookie checked against
 * the database on every request) and the role only from `profiles` — never
 * from anything the browser sends.
 */
export const getAuthContext = cache(async (): Promise<AuthContext | null> => {
  // Read the request first: this also marks the caller as request-specific,
  // so a page can never be prerendered with someone's (or no one's) session.
  const requestHeaders = await headers();
  let session: Awaited<ReturnType<ReturnType<typeof getAuth>['api']['getSession']>>;
  try {
    session = await getAuth().api.getSession({ headers: requestHeaders });
  } catch (error) {
    log.error('Session lookup failed', { error: describeError(error) });
    return null;
  }
  if (!session) return null;

  const userId = session.user.id;
  let profile: StaffProfile | null = null;
  try {
    const row = await adminDb(userId).maybeOne<{
      id: string;
      email: string | null;
      display_name: string;
      role: AppRole | null;
      is_active: boolean;
    }>(sql`select id, email, display_name, role, is_active from public.profiles where id = ${userId}`);
    profile = row
      ? { id: row.id, email: row.email, displayName: row.display_name, role: row.role, isActive: row.is_active }
      : null;
  } catch (error) {
    log.error('Failed to load profile', { error: describeError(error) });
  }

  return {
    userId,
    email: session.user.email ?? null,
    twoFactorEnabled: Boolean((session.user as { twoFactorEnabled?: boolean | null }).twoFactorEnabled),
    profile,
  };
});

function can(context: AuthContext | null, permission: Permission): boolean {
  return Boolean(context?.profile?.isActive && roleHasPermission(context.profile.role, permission));
}

function buildSession(context: AuthContext): AdminSession {
  return {
    ...context,
    profile: context.profile as StaffProfile & { role: AppRole },
    db: adminDb(context.userId),
  };
}

/**
 * Guard for admin pages and layouts.
 * - not signed in                 → redirect to /admin/login
 * - signed in, no permission      → 403 (app/forbidden.tsx)
 * - signed in, 2FA not set up yet → redirect to the security page (the only
 *                                   admin page reachable before 2FA)
 */
export async function requireAdminPage(
  permission: Permission = 'admin:access',
  options: { allowWithoutTwoFactor?: boolean } = {},
): Promise<AdminSession> {
  const context = await getAuthContext();
  if (!context) redirect('/admin/login');
  if (!can(context, 'admin:access') || !can(context, permission)) forbidden();
  if (!context.twoFactorEnabled && !options.allowWithoutTwoFactor) redirect(SECURITY_SETUP_PATH);
  return buildSession(context);
}

export type AuthorizationResult =
  | { ok: true; session: AdminSession }
  | { ok: false; status: 401 | 403; error: string };

/** Guard for Server Actions and Route Handlers: returns a result instead of throwing. */
export async function authorizeAdmin(
  permission: Permission = 'admin:access',
  options: { allowWithoutTwoFactor?: boolean } = {},
): Promise<AuthorizationResult> {
  const context = await getAuthContext();
  if (!context) return { ok: false, status: 401, error: 'Your session has expired. Sign in again.' };
  if (!can(context, 'admin:access') || !can(context, permission)) {
    return { ok: false, status: 403, error: 'You do not have permission to do this.' };
  }
  if (!context.twoFactorEnabled && !options.allowWithoutTwoFactor) {
    return { ok: false, status: 403, error: 'Set up two-factor authentication before making changes.' };
  }
  return { ok: true, session: buildSession(context) };
}
