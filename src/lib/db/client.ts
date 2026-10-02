import 'server-only';

import pg from 'pg';

import { getPool } from './pool';
import { compile, type SqlFragment } from './sql';

/**
 * Database access for the website. Every call runs in its own transaction
 * that first switches to the role matching who is asking:
 *
 *   publicDb()          → web_anon   (visitors; RLS exposes published content only)
 *   adminDb(profileId)  → web_admin  + app.profile_id = the verified profile
 *   serverDb()          → web_server (auth tables, contact inserts, rate limits)
 *
 * The profile id is only ever passed in by src/lib/auth/session.ts after the
 * session has been verified — never from request data.
 */

type Scope = { role: 'web_anon' } | { role: 'web_admin'; profileId: string } | { role: 'web_server' };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Plain, serialisable values for Server Components and Server Actions:
// timestamptz → ISO string, date → 'YYYY-MM-DD', bigint (count) → number.
const parseTimestamptz = pg.types.getTypeParser(pg.types.builtins.TIMESTAMPTZ, 'text');
const TYPES = {
  getTypeParser(oid: number, format?: 'text' | 'binary') {
    if (oid === pg.types.builtins.TIMESTAMPTZ) return (value: string) => (parseTimestamptz(value) as Date).toISOString();
    if (oid === pg.types.builtins.DATE) return (value: string) => value;
    if (oid === pg.types.builtins.INT8) return (value: string) => Number(value);
    return pg.types.getTypeParser(oid, format ?? 'text');
  },
} as unknown as pg.CustomTypesConfig;

export class NoRowsError extends Error {
  readonly code = 'P0002';
  constructor() {
    super('The query returned no rows');
    this.name = 'NoRowsError';
  }
}

export interface Queryable {
  /** All rows. */
  many<T>(query: SqlFragment): Promise<T[]>;
  /** First row or null. */
  maybeOne<T>(query: SqlFragment): Promise<T | null>;
  /** First row; throws NoRowsError (code P0002) when there is none. */
  one<T>(query: SqlFragment): Promise<T>;
  /** Number of affected rows. */
  execute(query: SqlFragment): Promise<number>;
}

export interface Db extends Queryable {
  /** Several statements in one transaction (same role and identity). */
  transaction<T>(fn: (tx: Queryable) => Promise<T>): Promise<T>;
}

function bind(client: pg.PoolClient): Queryable {
  const run = async <T>(query: SqlFragment) => {
    const { text, values } = compile(query);
    return client.query<T & pg.QueryResultRow>({ text, values, types: TYPES });
  };
  return {
    many: async <T>(query: SqlFragment) => (await run<T>(query)).rows as T[],
    maybeOne: async <T>(query: SqlFragment) => ((await run<T>(query)).rows[0] as T | undefined) ?? null,
    one: async <T>(query: SqlFragment) => {
      const row = (await run<T>(query)).rows[0] as T | undefined;
      if (row === undefined) throw new NoRowsError();
      return row;
    },
    execute: async (query: SqlFragment) => (await run(query)).rowCount ?? 0,
  };
}

async function inScope<T>(scope: Scope, fn: (tx: Queryable) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query('begin');
    if (scope.role === 'web_admin') {
      await client.query("select set_config('role', 'web_admin', true), set_config('app.profile_id', $1, true)", [
        scope.profileId,
      ]);
    } else {
      await client.query("select set_config('role', $1, true), set_config('app.profile_id', '', true)", [scope.role]);
    }
    const result = await fn(bind(client));
    await client.query('commit');
    return result;
  } catch (error) {
    await client.query('rollback').catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

function createDb(scope: Scope): Db {
  return {
    many: (query) => inScope(scope, (tx) => tx.many(query)),
    maybeOne: (query) => inScope(scope, (tx) => tx.maybeOne(query)),
    one: (query) => inScope(scope, (tx) => tx.one(query)),
    execute: (query) => inScope(scope, (tx) => tx.execute(query)),
    transaction: (fn) => inScope(scope, fn),
  };
}

const anonDb = createDb({ role: 'web_anon' });
const serverOnlyDb = createDb({ role: 'web_server' });

export function publicDb(): Db {
  return anonDb;
}

export function serverDb(): Db {
  return serverOnlyDb;
}

export function adminDb(profileId: string): Db {
  if (!UUID.test(profileId)) throw new Error('adminDb requires a verified profile id');
  return createDb({ role: 'web_admin', profileId });
}
