#!/usr/bin/env node
// Administrative accounts are managed here, never through the website: there
// is no sign-up page and no endpoint that creates users.
//
//   npm run admin -- create --email you@example.com --name "Fernando Osman"
//   npm run admin -- reset-password --email you@example.com
//   npm run admin -- reset-2fa --email you@example.com     (lost authenticator)
//   npm run admin -- revoke-sessions --email you@example.com
//   npm run admin -- list
//
// Passwords are typed at a hidden prompt (or piped on stdin), never passed as
// arguments, so they do not end up in shell history or process listings.
// Uses MIGRATION_DATABASE_URL (owner connection). On Railway run it inside the
// service with `railway ssh`, where the private database host is reachable.

import { createInterface } from 'node:readline';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { hashPassword } from 'better-auth/crypto';
import pg from 'pg';

import { loadEnvFiles } from './lib/load-env.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
loadEnvFiles(root);

const MIN_PASSWORD = 12;
const MAX_PASSWORD = 128;

function fail(message) {
  console.error(`✖ ${message}`);
  process.exit(1);
}

function option(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index > -1 ? process.argv[index + 1] : undefined;
}

// --- input -------------------------------------------------------------------

let pipedLines;
async function readPipedLine() {
  if (!pipedLines) {
    const chunks = [];
    for await (const chunk of process.stdin) chunks.push(chunk);
    pipedLines = Buffer.concat(chunks).toString('utf8').split(/\r?\n/);
  }
  return pipedLines.shift() ?? '';
}

function promptHidden(question) {
  if (!process.stdin.isTTY) return readPipedLine();
  return new Promise((resolvePrompt) => {
    process.stdout.write(question);
    const stdin = process.stdin;
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    let value = '';
    const onData = (char) => {
      if (char === '\r' || char === '\n') {
        stdin.setRawMode(false);
        stdin.pause();
        stdin.off('data', onData);
        process.stdout.write('\n');
        resolvePrompt(value);
      } else if (char === '\u0003') {
        process.stdout.write('\n');
        process.exit(130);
      } else if (char === '\u007f' || char === '\b') {
        value = value.slice(0, -1);
      } else {
        value += char;
      }
    };
    stdin.on('data', onData);
  });
}

function prompt(question) {
  if (!process.stdin.isTTY) return readPipedLine();
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolvePrompt) => rl.question(question, (answer) => (rl.close(), resolvePrompt(answer))));
}

async function askNewPassword() {
  const password = await promptHidden(`New password (min. ${MIN_PASSWORD} characters): `);
  if (password.length < MIN_PASSWORD || password.length > MAX_PASSWORD) {
    fail(`The password must have between ${MIN_PASSWORD} and ${MAX_PASSWORD} characters. A passphrase works well.`);
  }
  if (/^(.)\1+$/.test(password) || /^(?:password|senha|123456|qwerty)/i.test(password)) fail('Choose a less predictable password.');
  const confirmation = await promptHidden('Repeat the password: ');
  if (confirmation !== password) fail('The passwords do not match.');
  return password;
}

async function askEmail() {
  const email = (option('email') ?? (await prompt('E-mail: '))).trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length > 254) fail('Enter a valid e-mail address.');
  return email;
}

// --- commands ----------------------------------------------------------------

async function findUser(client, email) {
  const { rows } = await client.query('select id from auth."user" where email = $1', [email]);
  if (rows.length === 0) fail(`No account uses ${email}.`);
  return rows[0].id;
}

const commands = {
  async create(client) {
    const email = await askEmail();
    const name = (option('name') ?? (await prompt('Display name: '))).trim().slice(0, 120);
    if (!name) fail('Enter a display name.');
    const exists = await client.query('select 1 from auth."user" where email = $1', [email]);
    if (exists.rowCount > 0) fail(`An account for ${email} already exists. Use reset-password instead.`);

    const passwordHash = await hashPassword(await askNewPassword());
    await client.query('begin');
    try {
      const { rows } = await client.query(
        `insert into auth."user" (name, email, "emailVerified", "twoFactorEnabled", "updatedAt")
         values ($1, $2, true, false, now()) returning id`,
        [name, email],
      );
      const userId = rows[0].id;
      await client.query(
        `insert into auth.account ("accountId", "providerId", "userId", password, "updatedAt")
         values ($1::text, 'credential', $1::uuid, $2, now())`,
        [userId, passwordHash],
      );
      // The profile row is created by a trigger; grant the admin role here.
      await client.query('update public.profiles set role = $1, display_name = $2 where id = $3', ['admin', name, userId]);
      await client.query('commit');
    } catch (error) {
      await client.query('rollback');
      throw error;
    }
    console.log(`✓ Admin account created for ${email}.`);
    console.log('  Sign in at /admin/login. You will be asked to set up two-factor authentication first.');
  },

  async 'reset-password'(client) {
    const email = await askEmail();
    const userId = await findUser(client, email);
    const passwordHash = await hashPassword(await askNewPassword());
    await client.query('begin');
    const updated = await client.query(
      `update auth.account set password = $1, "updatedAt" = now() where "userId" = $2 and "providerId" = 'credential'`,
      [passwordHash, userId],
    );
    if (updated.rowCount === 0) {
      await client.query(
        `insert into auth.account ("accountId", "providerId", "userId", password, "updatedAt") values ($1::text, 'credential', $1::uuid, $2, now())`,
        [userId, passwordHash],
      );
    }
    await client.query('delete from auth.session where "userId" = $1', [userId]);
    await client.query('commit');
    console.log(`✓ Password changed for ${email}. All of its sessions were signed out.`);
  },

  async 'reset-2fa'(client) {
    const email = await askEmail();
    const userId = await findUser(client, email);
    await client.query('begin');
    await client.query('delete from auth."twoFactor" where "userId" = $1', [userId]);
    await client.query('update auth."user" set "twoFactorEnabled" = false, "updatedAt" = now() where id = $1', [userId]);
    await client.query('delete from auth.session where "userId" = $1', [userId]);
    await client.query('commit');
    console.log(`✓ Two-factor authentication removed for ${email}. It must be set up again at the next sign-in.`);
  },

  async 'revoke-sessions'(client) {
    const email = await askEmail();
    const userId = await findUser(client, email);
    const { rowCount } = await client.query('delete from auth.session where "userId" = $1', [userId]);
    console.log(`✓ Signed out ${rowCount} session(s) of ${email}.`);
  },

  async list(client) {
    const { rows } = await client.query(`
      select u.email, u.name, p.role, p.is_active, coalesce(u."twoFactorEnabled", false) as two_factor,
             (select count(*) from auth.session s where s."userId" = u.id and s."expiresAt" > now())::int as sessions
      from auth."user" u left join public.profiles p on p.id = u.id
      order by u."createdAt"`);
    if (rows.length === 0) console.log('No accounts yet. Create one with: npm run admin -- create');
    else console.table(rows);
  },
};

async function main() {
  const command = process.argv[2];
  if (!command || !(command in commands)) {
    console.log('Usage: npm run admin -- <create|reset-password|reset-2fa|revoke-sessions|list> [--email …] [--name …]');
    process.exit(command ? 1 : 0);
  }
  const url = process.env.MIGRATION_DATABASE_URL || process.env.DATABASE_URL;
  if (!url) fail('Set MIGRATION_DATABASE_URL (owner connection).');

  const client = new pg.Client({ connectionString: url, application_name: 'portfolio-admin' });
  await client.connect();
  // Act as the owner itself, even if a default role was configured for it.
  await client.query('reset role');
  try {
    await commands[command](client);
  } finally {
    await client.end();
  }
}

main().catch((error) => fail(error.message));
