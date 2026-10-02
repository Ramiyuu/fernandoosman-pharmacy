#!/usr/bin/env node
// Local end-to-end stack, for testing the real site without Railway or R2:
//
//   • PostgreSQL: PGlite (Postgres 17 in WebAssembly) behind a wire-protocol
//     socket, migrated with the real scripts/db/migrate.mjs and seeded;
//   • the admin account created with the real scripts/admin.mjs, plus an
//     account without a role;
//   • R2: an S3 stand-in that verifies SigV4 signatures (tests/e2e/mock-r2.mjs).
//
// Writes the matching environment to .e2e/env. Then, in another terminal:
//   set -a; . ./.e2e/env; set +a; npm run build && npm start
//
// Everything is in memory and disappears when this process stops.

import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';
import { hashPassword } from 'better-auth/crypto';

import { DB_PORT, R2_PORT, TEST_ACCOUNTS, TEST_APP_DB_PASSWORD, TEST_AUTH_SECRET, TEST_R2 } from './fixtures.mjs';
import { startMockR2 } from './mock-r2.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const ownerUrl = `postgresql://postgres:postgres@127.0.0.1:${DB_PORT}/postgres`;
const appUrl = `postgresql://portfolio_app:${TEST_APP_DB_PASSWORD}@127.0.0.1:${DB_PORT}/postgres`;

const env = {
  NEXT_PUBLIC_SITE_URL: process.env.E2E_SITE_URL ?? 'http://localhost:3000',
  DATABASE_URL: appUrl,
  MIGRATION_DATABASE_URL: ownerUrl,
  DATABASE_POOL_MAX: '4',
  BETTER_AUTH_SECRET: TEST_AUTH_SECRET,
  R2_ACCOUNT_ID: TEST_R2.accountId,
  R2_ACCESS_KEY_ID: TEST_R2.accessKeyId,
  R2_SECRET_ACCESS_KEY: TEST_R2.secretAccessKey,
  R2_BUCKET: TEST_R2.bucket,
  R2_ENDPOINT: `http://127.0.0.1:${R2_PORT}`,
};

function run(script, args, input) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(process.execPath, [join(root, script), ...args], {
      cwd: root,
      env: { ...process.env, ...env },
      stdio: ['pipe', 'inherit', 'inherit'],
    });
    child.stdin.end(input ?? '');
    child.on('exit', (code) => (code === 0 ? resolvePromise() : reject(new Error(`${script} exited with ${code}`))));
  });
}

const db = await PGlite.create();
const server = new PGLiteSocketServer({ db, port: DB_PORT, host: '127.0.0.1', maxConnections: 20 });
await server.start();
console.log(`✓ PostgreSQL (PGlite) on 127.0.0.1:${DB_PORT}`);

await run('scripts/db/migrate.mjs', ['--seed']);

const admin = TEST_ACCOUNTS.admin;
await run('scripts/admin.mjs', ['create', '--email', admin.email, '--name', admin.name], `${admin.password}\n${admin.password}\n`);

// An account that can sign in but has no role (must get 403 in the panel).
const reader = TEST_ACCOUNTS.noRole;
const { rows } = await db.query(
  `insert into auth."user" (name, email, "emailVerified", "updatedAt") values ($1, $2, true, now()) returning id`,
  [reader.name, reader.email],
);
await db.query(
  `insert into auth.account ("accountId", "providerId", "userId", password, "updatedAt") values ($1::text, 'credential', $1::uuid, $2, now())`,
  [rows[0].id, await hashPassword(reader.password)],
);
console.log(`✓ Test accounts: ${admin.email} (admin), ${reader.email} (no role)`);

await startMockR2({
  port: R2_PORT,
  credentials: TEST_R2,
  log: process.env.E2E_VERBOSE ? (line) => console.log(`[r2] ${line}`) : () => {},
});
console.log(`✓ R2 stand-in on 127.0.0.1:${R2_PORT} (bucket ${TEST_R2.bucket})`);

mkdirSync(join(root, '.e2e'), { recursive: true });
writeFileSync(
  join(root, '.e2e/env'),
  Object.entries(env)
    .filter(([key]) => key !== 'MIGRATION_DATABASE_URL')
    .map(([key, value]) => `${key}=${value}`)
    .join('\n') + '\n',
);
console.log('✓ Environment written to .e2e/env. Press Ctrl+C to stop.');

const stop = async () => {
  await server.stop();
  await db.close();
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
