export type FieldErrors = Record<string, string[] | undefined>;

export type ActionResult<T = undefined> =
  | { ok: true; data: T; message?: string }
  | { ok: false; error: string; fieldErrors?: FieldErrors; code?: 'UNAUTHENTICATED' | 'FORBIDDEN' | 'RATE_LIMITED' | 'CONFLICT' | 'NOT_FOUND' };

export function ok<T>(data: T, message?: string): ActionResult<T> {
  return { ok: true, data, message };
}

export function fail(
  error: string,
  options: { fieldErrors?: FieldErrors; code?: Extract<ActionResult, { ok: false }>['code'] } = {},
): { ok: false; error: string; fieldErrors?: FieldErrors; code?: Extract<ActionResult, { ok: false }>['code'] } {
  return { ok: false, error, ...options };
}
