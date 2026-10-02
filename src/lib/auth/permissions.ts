import type { AppRole } from '@/types/database.types';

export type Permission =
  | 'admin:access'
  | 'articles:write'
  | 'articles:publish'
  | 'articles:delete'
  | 'projects:write'
  | 'files:write'
  | 'taxonomy:write'
  | 'profile:write'
  | 'settings:write'
  | 'messages:manage';

const ALL_PERMISSIONS: readonly Permission[] = [
  'admin:access',
  'articles:write',
  'articles:publish',
  'articles:delete',
  'projects:write',
  'files:write',
  'taxonomy:write',
  'profile:write',
  'settings:write',
  'messages:manage',
];

/**
 * Application-level permissions per role. The database enforces the same
 * boundaries independently through RLS (see supabase/migrations/*_rls_policies.sql).
 *
 * `editor` is prepared but intentionally has no panel access yet. To enable it,
 * grant e.g. 'admin:access' and 'articles:write' here; RLS already restricts
 * editors to their own unpublished articles.
 */
const ROLE_PERMISSIONS: Record<AppRole, readonly Permission[]> = {
  admin: ALL_PERMISSIONS,
  editor: [],
};

export function roleHasPermission(role: AppRole | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role].includes(permission);
}
