#!/usr/bin/env node
// Applies db/migrations/*.sql in order (each file once, in its own
// transaction) and provisions the website's least-privilege login role.
//
// Environment
//   MIGRATION_DATABASE_URL  owner connection (on Railway: ${{Postgres.DATABASE_URL}}).
//                           Used only by this script and `npm run admin`.
//   DATABASE_URL            the website's connection. Its user (e.g. portfolio_app)
//                           is created/updated here with that password, as a
//                           member of web_server only.
//
// Usage
//   npm run db:migrate            migrations + login role
//   npm run db:migrate -- --seed  also loads db/seed.sql (sample content, idempotent)
//
// Applied migrations are recorded with a checksum; editing a migration that
// already ran is refused (write a new migration instead).

import { createHash, createHmac, pbkdf2Sync, randomBytes } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import pg from 'pg';

import { loadEnvFiles } from '../lib/load-env.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const MIGRATIONS_DIR = join(root, 'db/migrations');
const SEED_FILE = join(root, 'db/seed.sql');
const MIN_SERVER_VERSION = 160000;
const LOCK_ID = 8_031_442_271;

loadEnvFiles(root);

function fail(message) {
  console.error(`\n✖ ${message}`);
  process.exit(1);
}

function parseConnection(url, name) {
  try {
    const parsed = new URL(url);
    if (!/^postgres(ql)?:$/.test(parsed.protocol)) throw new Error('protocol');
    return parsed;
  } catch {
    fail(`${name} is not a valid postgres:// connection string.`);
  }
}

/**
 * SCRAM-SHA-256 verifier (RFC 7677), the format PostgreSQL stores. Sending the
 * verifier instead of the password keeps the clear-text password out of the
 * statement text, and therefore out of any server log.
 */
function scramVerifier(password) {
  const iterations = 4096;
  const salt = randomBytes(16);
  const salted = pbkdf2Sync(password.normalize('NFKC'), salt, iterations, 32, 'sha256');
  const clientKey = createHmac('sha256', salted).update('Client Key').digest();
  const storedKey = createHash('sha256').update(clientKey).digest();
  const serverKey = createHmac('sha256', salted).update('Server Key').digest();
  return `SCRAM-SHA-256$${iterations}:${salt.toString('base64')}$${storedKey.toString('base64')}:${serverKey.toString('base64')}`;
}

const checksum = (text) => createHash('sha256').update(text.replace(/\r\n/g, '\n')).digest('hex');

async function applyMigrations(client) {
  await client.query('create schema if not exists private');
  await client.query(`
    create table if not exists private.schema_migrations (
      name text primary key,
      checksum text not null,
      applied_at timestamptz not null default now()
    )`);

  const applied = new Map(
    (await client.query('select name, checksum from private.schema_migrations')).rows.map((row) => [
      row.name,
      row.checksum,
    ]),
  );

  const files = readdirSync(MIGRATIONS_DIR)
    .filter((name) => /^\d{4}_[a-z0-9_]+\.sql$/.test(name))
    .sort();
  let count = 0;
  for (const file of files) {
    const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf8');
    const sum = checksum(sql);
    if (applied.has(file)) {
      if (applied.get(file) !== sum) {
        fail(`${file} changed after it was applied. Revert the edit and add a new migration instead.`);
      }
      continue;
    }
    process.stdout.write(`→ ${file} … `);
    try {
      await client.query('begin');
      await client.query(sql);
      await client.query('insert into private.schema_migrations (name, checksum) values ($1, $2)', [file, sum]);
      await client.query('commit');
    } catch (error) {
      await client.query('rollback').catch(() => {});
      console.log('failed');
      throw error;
    }
    console.log('done');
    count += 1;
  }
  console.log(count === 0 ? '✓ Database schema is up to date.' : `✓ Applied ${count} migration(s).`);
}

async function provisionLoginRole(client, ownerUser) {
  const appUrl = process.env.DATABASE_URL;
  if (!appUrl) {
    console.warn('! DATABASE_URL is not set: skipping the website login role.');
    return;
  }
  const parsed = parseConnection(appUrl, 'DATABASE_URL');
  const user = decodeURIComponent(parsed.username);
  const password = decodeURIComponent(parsed.password);

  if (user === ownerUser) {
    fail(
      `DATABASE_URL uses the owner role "${user}". The website should connect with its own role\n` +
        '  (e.g. portfolio_app) so a bug can never alter the schema. See README → Railway.',
    );
    return;
  }
  if (!/^[a-z_][a-z0-9_]{0,62}$/.test(user)) fail('The DATABASE_URL user must be lower-case letters, digits or _.');
  if (['web_anon', 'web_admin', 'web_server', 'postgres'].includes(user))
    fail(`"${user}" is reserved; use e.g. portfolio_app.`);
  if (password.length < 24 || !/^[\x21-\x7e]+$/.test(password)) {
    fail(
      'The DATABASE_URL password must have at least 24 printable ASCII characters (generate one: openssl rand -hex 24).',
    );
  }

  const verifier = scramVerifier(password);
  const exists = (await client.query('select 1 from pg_roles where rolname = $1', [user])).rowCount > 0;
  const attributes = 'login inherit nosuperuser nocreatedb nocreaterole noreplication nobypassrls connection limit 30';
  const statement = (
    await client.query(
      exists
        ? `select format('alter role %I with ${attributes} password %L', $1::text, $2::text) as sql`
        : `select format('create role %I with ${attributes} password %L', $1::text, $2::text) as sql`,
      [user, verifier],
    )
  ).rows[0].sql;
  await client.query(statement);

  const database = (await client.query('select current_database() as name')).rows[0].name;
  // Identifiers and literals are quoted by format(%I / %L) on the server.
  const grants = [
    ["select format('grant web_server to %I', $1::text) as sql", [user]],
    ["select format('alter role %I set statement_timeout = %L', $1::text, '20s') as sql", [user]],
    ["select format('alter role %I set idle_in_transaction_session_timeout = %L', $1::text, '30s') as sql", [user]],
    ["select format('grant connect on database %I to %I', $1::text, $2::text) as sql", [database, user]],
    ["select format('revoke connect on database %I from public', $1::text) as sql", [database]],
  ];
  for (const [query, params] of grants) {
    const sql = (await client.query(query, params)).rows[0].sql;
    await client.query(sql);
  }
  console.log(`✓ Login role "${user}" ${exists ? 'updated' : 'created'} (member of web_server only).`);
}

async function main() {
  const migrationUrl = process.env.MIGRATION_DATABASE_URL || process.env.DATABASE_URL;
  if (!migrationUrl) fail('Set MIGRATION_DATABASE_URL (owner connection) — see .env.example.');
  if (!process.env.MIGRATION_DATABASE_URL) {
    console.warn('! MIGRATION_DATABASE_URL is not set: using DATABASE_URL as the owner connection.');
  }
  const ownerUser = decodeURIComponent(parseConnection(migrationUrl, 'MIGRATION_DATABASE_URL').username);

  const client = new pg.Client({ connectionString: migrationUrl, application_name: 'portfolio-migrate' });
  await client.connect();
  // Act as the owner itself, even if a default role was configured for it.
  await client.query('reset role');
  try {
    const version = Number((await client.query('show server_version_num')).rows[0].server_version_num);
    if (version < MIN_SERVER_VERSION) fail(`PostgreSQL 16 or newer is required (found ${version}).`);

    await client.query('select pg_advisory_lock($1)', [LOCK_ID]);
    if (process.argv.includes('--seed')) {
      if (process.env.NODE_ENV === 'production') fail('Seed is disabled in production.');
      const table = await client.query("select to_regclass('public.articles') as name");
      if (table.rows[0].name) {
        const content = await client.query(
          'select (select count(*) from public.articles) + (select count(*) from public.projects) as total',
        );
        if (Number(content.rows[0].total) > 0)
          fail('Seed refused: database already contains content. Use an empty test database.');
      }
    }
    await applyMigrations(client);
    await provisionLoginRole(client, ownerUser);

    if (process.argv.includes('--seed')) {
      await client.query(readFileSync(SEED_FILE, 'utf8'));
      console.log('✓ Sample content loaded (db/seed.sql).');
    }
  } finally {
    await client.query('select pg_advisory_unlock($1)', [LOCK_ID]).catch(() => {});
    await client.end();
  }
}

main().catch((error) => {
  // Never print connection strings; pg errors do not contain them.
  console.error(`\n✖ Migration failed: ${error.message}`);
  process.exit(1);
});
