import 'server-only';

import { fail } from '@/lib/action-result';

import type { Permission } from './permissions';
import { authorizeAdmin, type AdminSession } from './session';

/**
 * First line of every admin Server Action. Server Actions are public HTTP
 * endpoints, so authorisation is checked here — never assumed from the UI.
 */
export async function guardAction(
  permission: Permission,
): Promise<{ ok: true; session: AdminSession } | ReturnType<typeof fail>> {
  const result = await authorizeAdmin(permission);
  if (!result.ok) return fail(result.error, { code: result.status === 401 ? 'UNAUTHENTICATED' : 'FORBIDDEN' });
  return result;
}
