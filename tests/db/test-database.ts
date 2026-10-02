import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { PGlite } from '@electric-sql/pglite';

const root = resolve(__dirname, '../..');

export type DbRole = 'anon' | 'authenticated' | 'service_role';

export interface TestUser {
  id: string;
  email: string;
}

/**
 * Boots an in-memory Postgres (PGlite), applies the Supabase stub, every
 * migration in order and the seed — the same SQL that runs in production.
 */
export async function createTestDatabase(options: { seed?: boolean } = {}) {
  const db = new PGlite();
  await db.exec(readFileSync(join(root, 'tests/db/supabase-stub.sql'), 'utf8'));

  const migrationsDir = join(root, 'supabase/migrations');
  for (const file of readdirSync(migrationsDir).filter((name) => name.endsWith('.sql')).sort()) {
    await db.exec(readFileSync(join(migrationsDir, file), 'utf8'));
  }

  if (options.seed !== false) {
    await db.exec(readFileSync(join(root, 'supabase/seed.sql'), 'utf8'));
  }

  return db;
}

export async function createUser(
  db: PGlite,
  email: string,
  role: 'admin' | 'editor' | null,
): Promise<TestUser> {
  const id = crypto.randomUUID();
  await db.query('insert into auth.users (id, email) values ($1, $2)', [id, email]);
  if (role) {
    await db.query('update public.profiles set role = $1 where id = $2', [role, id]);
  }
  return { id, email };
}

/** Runs `fn` with the privileges and JWT claims PostgREST would use. */
export async function actAs<T>(
  db: PGlite,
  role: DbRole,
  user: TestUser | null,
  fn: () => Promise<T>,
): Promise<T> {
  const claims = JSON.stringify(user ? { sub: user.id, role } : { role });
  await db.query("select set_config('request.jwt.claims', $1, false)", [claims]);
  await db.exec(`set role ${role}`);
  try {
    return await fn();
  } finally {
    await db.exec('reset role');
    await db.query("select set_config('request.jwt.claims', '', false)");
  }
}

export async function rows<T>(db: PGlite, sql: string, params: unknown[] = []): Promise<T[]> {
  const result = await db.query<T>(sql, params);
  return result.rows;
}
