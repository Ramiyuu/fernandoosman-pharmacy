import 'server-only';

import { forbidden, redirect } from 'next/navigation';
import { cache } from 'react';

import { createLogger, describeError } from '@/lib/logger';
import { createServerSupabase, type ServerSupabase } from '@/lib/supabase/server';
import type { AppRole } from '@/types/database.types';

import { roleHasPermission, type Permission } from './permissions';

const log = createLogger('auth');

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
  profile: StaffProfile | null;
}

export interface AdminSession extends AuthContext {
  profile: StaffProfile & { role: AppRole };
  supabase: ServerSupabase;
}

/**
 * Resolves the signed-in user for this request (memoised per request).
 * Identity comes only from Supabase Auth (getUser validates the JWT with the
 * Auth server) and the role only from the database — never from the client.
 */
export const getAuthContext = cache(async (): Promise<AuthContext | null> => {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, email, display_name, role, is_active')
    .eq('id', data.user.id)
    .maybeSingle();

  if (profileError) {
    log.error('Failed to load profile', { error: describeError(profileError) });
  }

  return {
    userId: data.user.id,
    email: data.user.email ?? null,
    profile: profile
      ? {
          id: profile.id,
          email: profile.email,
          displayName: profile.display_name,
          role: profile.role,
          isActive: profile.is_active,
        }
      : null,
  };
});

function can(context: AuthContext | null, permission: Permission): boolean {
  return Boolean(context?.profile?.isActive && roleHasPermission(context.profile.role, permission));
}

async function buildSession(context: AuthContext): Promise<AdminSession> {
  return {
    ...context,
    profile: context.profile as StaffProfile & { role: AppRole },
    supabase: await createServerSupabase(),
  };
}

/**
 * Guard for admin pages and layouts.
 * - not signed in            → redirect to /admin/login
 * - signed in, no permission → 403 (app/forbidden.tsx)
 */
export async function requireAdminPage(permission: Permission = 'admin:access'): Promise<AdminSession> {
  const context = await getAuthContext();
  if (!context) redirect('/admin/login');
  if (!can(context, permission)) forbidden();
  return buildSession(context);
}

export type AuthorizationResult =
  | { ok: true; session: AdminSession }
  | { ok: false; status: 401 | 403; error: string };

/** Guard for Server Actions and Route Handlers: returns a result instead of throwing. */
export async function authorizeAdmin(permission: Permission = 'admin:access'): Promise<AuthorizationResult> {
  const context = await getAuthContext();
  if (!context) return { ok: false, status: 401, error: 'Your session has expired. Sign in again.' };
  if (!can(context, 'admin:access') || !can(context, permission)) {
    return { ok: false, status: 403, error: 'You do not have permission to do this.' };
  }
  return { ok: true, session: await buildSession(context) };
}
