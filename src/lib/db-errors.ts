import { fail } from './action-result';
import { createLogger, describeError } from './logger';

const log = createLogger('db');

/** Maps Postgres errors (SQLSTATE codes) to user-facing messages without leaking internals. */
export function failFromDbError(operation: string, error: unknown) {
  const code = typeof error === 'object' && error && 'code' in error ? String((error as { code: unknown }).code) : '';
  log.error(`${operation} failed`, { error: describeError(error) });

  switch (code) {
    case '23505':
      return fail('That slug or name is already in use. Choose another one.', { code: 'CONFLICT' });
    case '23503':
      return fail('A linked item no longer exists. Reload the page and try again.', { code: 'CONFLICT' });
    case '23514':
    case '22P02':
    case '23502':
      return fail('One of the values is not valid. Check the fields and try again.');
    case '42501':
      return fail('You do not have permission to do this.', { code: 'FORBIDDEN' });
    case 'P0002':
      return fail('This item no longer exists.', { code: 'NOT_FOUND' });
    case 'FOT01':
      // Raised by the translation-link checks (0016); the message is written for people.
      return fail(
        error instanceof Error && error.message
          ? error.message
          : 'That language version is not valid. Each text has one version per language, linked to the original.',
        { code: 'CONFLICT' },
      );
    default:
      return fail('The database could not complete the request. Try again in a moment.');
  }
}
