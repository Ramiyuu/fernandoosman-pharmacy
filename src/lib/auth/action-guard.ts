import 'server-only';

import { fail } from '@/lib/action-result';

import type { Permission } from './permissions';
import { authorizeAdmin, type AdminSession } from './session';

/**
 * First line of every admin Server Action. Server Actions are public HTTP
 * endpoints, so authorisation is checked here — never assumed from the UI.
 * Two-factor authentication must be active unless the action is part of
 * setting it up.
 */
export async function guardAction(
  permission: Permission,
  options: { allowWithoutTwoFactor?: boolean } = {},
): Promise<{ ok: true; session: AdminSession } | ReturnType<typeof fail>> {
  const result = await authorizeAdmin(permission, options);
  if (!result.ok) return fail(result.error, { code: result.status === 401 ? 'UNAUTHENTICATED' : 'FORBIDDEN' });
  return result;
}
