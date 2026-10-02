import { createLogger, describeError } from '@/lib/logger';

const log = createLogger('data');

/** Raised when the database cannot be reached or a query fails. Rendered as a 500 page. */
export class DataAccessError extends Error {
  constructor(operation: string) {
    super(`Could not load data (${operation}).`);
    this.name = 'DataAccessError';
  }
}

/** Logs the underlying (possibly verbose) error server-side and throws a generic one. */
export function failQuery(operation: string, error: unknown): never {
  log.error(`Query failed: ${operation}`, { error: describeError(error) });
  throw new DataAccessError(operation);
}
