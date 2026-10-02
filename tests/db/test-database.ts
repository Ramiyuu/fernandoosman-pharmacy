import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { PGlite } from '@electric-sql/pglite';

const root = resolve(__dirname, '../..');

export type DbRole = 'web_anon' | 'web_admin' | 'web_server';

export interface TestUser {
  id: string;
  email: string;
}

/**
 * Boots an in-memory Postgres (PGlite) and applies every migration in order
 * plus the seed: the same SQL that runs in production.
 */
export async function createTestDatabase(options: { seed?: boolean } = {}) {
  const db = new PGlite();

  const migrationsDir = join(root, 'db/migrations');
  for (const file of readdirSync(migrationsDir).filter((name) => name.endsWith('.sql')).sort()) {
    await db.exec(readFileSync(join(migrationsDir, file), 'utf8'));
  }

  if (options.seed !== false) {
    await db.exec(readFileSync(join(root, 'db/seed.sql'), 'utf8'));
  }

  return db;
}

/** Creates an auth user (the profile row comes from the trigger) and optionally grants a role. */
export async function createUser(db: PGlite, email: string, role: 'admin' | 'editor' | null): Promise<TestUser> {
  const result = await db.query<{ id: string }>(
    `insert into auth."user" (name, email, "emailVerified", "updatedAt") values ($1, $2, true, now()) returning id`,
    [email.split('@')[0], email],
  );
  const id = result.rows[0].id;
  if (role) {
    await db.query('update public.profiles set role = $1 where id = $2', [role, id]);
  }
  return { id, email };
}

/**
 * Runs `fn` exactly like src/lib/db/client.ts does: switched to a web role,
 * with app.profile_id set to the verified user (or empty for visitors).
 */
export async function actAs<T>(db: PGlite, role: DbRole, user: TestUser | null, fn: () => Promise<T>): Promise<T> {
  await db.query("select set_config('app.profile_id', $1, false)", [user?.id ?? '']);
  await db.exec(`set role ${role}`);
  try {
    return await fn();
  } finally {
    await db.exec('reset role');
    await db.query("select set_config('app.profile_id', '', false)");
  }
}

export async function rows<T>(db: PGlite, sql: string, params: unknown[] = []): Promise<T[]> {
  const result = await db.query<T>(sql, params);
  return result.rows;
}
