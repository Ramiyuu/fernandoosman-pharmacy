import { fail } from './action-result';
import { createLogger, describeError } from './logger';

const log = createLogger('db');

/** Maps PostgREST/Postgres errors to user-facing messages without leaking internals. */
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
    case 'PGRST116':
      return fail('This item no longer exists.', { code: 'NOT_FOUND' });
    default:
      return fail('The database could not complete the request. Try again in a moment.');
  }
}
