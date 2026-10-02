/** Better Auth error code (e.g. INVALID_EMAIL_OR_PASSWORD) from a thrown APIError, for logs and messages. */
export function authErrorCode(error: unknown): string | null {
  if (error && typeof error === 'object' && 'body' in error) {
    const body = (error as { body?: { code?: unknown } }).body;
    if (typeof body?.code === 'string') return body.code;
  }
  return null;
}
