#!/usr/bin/env node
/**
 * LOCAL TEST TOOLING ONLY — never deploy.
 *
 * A minimal stand-in for the Supabase APIs the app uses (Auth, PostgREST and
 * Storage subsets), so the real Next.js app can be exercised end-to-end on a
 * machine without Docker. The database is PGlite (real Postgres compiled to
 * WASM) running the production migrations, RLS policies and seed: every query
 * runs under the same role (anon / authenticated / service_role) and JWT
 * claims PostgREST would use, so RLS behaves exactly as in production.
 *
 * Usage: node tests/e2e/mock-supabase.mjs
 * Writes the matching environment variables to .mock-supabase/env.
 */
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { createReadStream, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import http from 'node:http';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { PGlite } from '@electric-sql/pglite';
import { jwtVerify, SignJWT } from 'jose';

import { MOCK_JWT_SECRET, MOCK_PORT, MOCK_URL, TEST_ACCOUNTS } from './fixtures.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const stateDir = resolve(root, '.mock-supabase');
const storageDir = join(stateDir, 'storage');
const secret = new TextEncoder().encode(MOCK_JWT_SECRET);
const log = (...args) => console.log('[mock-supabase]', ...args);

// ---------------------------------------------------------------------------
// Database
// ---------------------------------------------------------------------------
const db = new PGlite();
await db.exec(readFileSync(join(root, 'tests/db/supabase-stub.sql'), 'utf8'));
for (const file of readdirSync(join(root, 'supabase/migrations')).filter((name) => name.endsWith('.sql')).sort()) {
  await db.exec(readFileSync(join(root, 'supabase/migrations', file), 'utf8'));
}
await db.exec(readFileSync(join(root, 'supabase/seed.sql'), 'utf8'));

const users = new Map();
for (const account of Object.values(TEST_ACCOUNTS)) {
  const id = randomUUID();
  await db.query('insert into auth.users (id, email, raw_user_meta_data) values ($1, $2, $3)', [id, account.email, { display_name: account.displayName }]);
  if (account.role) await db.query('update public.profiles set role = $1 where id = $2', [account.role, id]);
  users.set(account.email, { id, email: account.email, password: account.password, createdAt: new Date().toISOString() });
}
const adminId = users.get(TEST_ACCOUNTS.admin.email).id;
await db.query('update public.articles set author_id = $1 where author_id is null', [adminId]);
await db.query('update public.projects set author_id = $1 where author_id is null', [adminId]);

let queue = Promise.resolve();
function exclusive(task) {
  const run = queue.then(task, task);
  queue = run.catch(() => undefined);
  return run;
}

async function asRole(context, task) {
  return exclusive(async () => {
    await db.exec('begin');
    try {
      await db.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify(context.claims)]);
      await db.exec(`set local role ${context.role}`);
      const result = await task();
      await db.exec('commit');
      return result;
    } catch (error) {
      await db.exec('rollback');
      throw error;
    }
  });
}

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------
class HttpError extends Error {
  constructor(status, body) {
    super(body?.message ?? `HTTP ${status}`);
    this.status = status;
    this.body = body;
  }
}

function send(res, status, body, headers = {}) {
  if (body === undefined || status === 204) {
    res.writeHead(status, headers);
    res.end();
    return;
  }
  const payload = typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body);
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', ...headers });
  res.end(payload);
}

async function readBody(req, limit = 120 * 1024 * 1024) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw new HttpError(413, { statusCode: '413', error: 'Payload too large', message: 'Body too large' });
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function readJson(req) {
  const buffer = await readBody(req);
  if (buffer.length === 0) return {};
  return JSON.parse(buffer.toString('utf8'));
}

function setCors(res) {
  res.setHeader('access-control-allow-origin', '*');
  res.setHeader('access-control-allow-methods', 'GET,POST,PUT,PATCH,DELETE,HEAD,OPTIONS');
  res.setHeader('access-control-allow-headers', 'authorization,apikey,content-type,x-client-info,x-upsert,cache-control,prefer,accept,range,accept-profile,content-profile,x-supabase-api-version');
  res.setHeader('access-control-expose-headers', 'content-range,content-length,content-type');
}

async function sign(claims, expiresInSeconds) {
  return new SignJWT(claims)
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + expiresInSeconds)
    .sign(secret);
}

// API keys, deterministic for a given secret (like Supabase legacy keys).
const anonKey = await new SignJWT({ role: 'anon', iss: 'supabase-mock' }).setProtectedHeader({ alg: 'HS256', typ: 'JWT' }).setIssuedAt(0).sign(secret);
const serviceKey = await new SignJWT({ role: 'service_role', iss: 'supabase-mock' }).setProtectedHeader({ alg: 'HS256', typ: 'JWT' }).setIssuedAt(0).sign(secret);

// ---------------------------------------------------------------------------
// Auth (GoTrue subset)
// ---------------------------------------------------------------------------
const sessions = new Map(); // session_id -> user id
const refreshTokens = new Map(); // refresh token -> { sessionId, userId }

function userJson(user) {
  return {
    id: user.id,
    aud: 'authenticated',
    role: 'authenticated',
    email: user.email,
    email_confirmed_at: user.createdAt,
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: {},
    identities: [],
    created_at: user.createdAt,
    updated_at: user.createdAt,
  };
}

async function issueSession(user, sessionId = randomUUID()) {
  const expiresIn = 3600;
  const accessToken = await sign({ sub: user.id, email: user.email, role: 'authenticated', aud: 'authenticated', session_id: sessionId, aal: 'aal1' }, expiresIn);
  const refreshToken = randomBytes(24).toString('hex');
  sessions.set(sessionId, user.id);
  refreshTokens.set(refreshToken, { sessionId, userId: user.id });
  return {
    access_token: accessToken,
    token_type: 'bearer',
    expires_in: expiresIn,
    expires_at: Math.floor(Date.now() / 1000) + expiresIn,
    refresh_token: refreshToken,
    user: userJson(user),
  };
}

async function verifyUserToken(token) {
  const { payload } = await jwtVerify(token, secret);
  if (payload.role !== 'authenticated' || !sessions.has(payload.session_id)) throw new Error('session not found');
  return payload;
}

function bearer(req) {
  const header = req.headers.authorization ?? '';
  return header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : null;
}

async function handleAuth(req, res, url) {
  const path = url.pathname.replace('/auth/v1', '');
  if (path === '/token' && req.method === 'POST') {
    const body = await readJson(req);
    const grant = url.searchParams.get('grant_type');
    if (grant === 'password') {
      const user = users.get(String(body.email ?? '').toLowerCase());
      if (!user || user.password !== body.password) {
        return send(res, 400, { code: 400, error_code: 'invalid_credentials', msg: 'Invalid login credentials' });
      }
      return send(res, 200, await issueSession(user));
    }
    if (grant === 'refresh_token') {
      const entry = refreshTokens.get(body.refresh_token);
      if (!entry) return send(res, 400, { code: 400, error_code: 'refresh_token_not_found', msg: 'Invalid Refresh Token' });
      refreshTokens.delete(body.refresh_token);
      const user = [...users.values()].find((candidate) => candidate.id === entry.userId);
      return send(res, 200, await issueSession(user, entry.sessionId));
    }
    return send(res, 400, { code: 400, error_code: 'unsupported_grant_type', msg: 'Unsupported grant type' });
  }
  if (path === '/user' && req.method === 'GET') {
    try {
      const claims = await verifyUserToken(bearer(req) ?? '');
      const user = [...users.values()].find((candidate) => candidate.id === claims.sub);
      return send(res, 200, userJson(user));
    } catch {
      return send(res, 403, { code: 403, error_code: 'session_not_found', msg: 'Session from session_id claim in JWT does not exist' });
    }
  }
  if (path === '/logout' && req.method === 'POST') {
    try {
      const claims = await verifyUserToken(bearer(req) ?? '');
      sessions.delete(claims.session_id);
    } catch {
      // already signed out
    }
    return send(res, 204);
  }
  if (path === '/otp' && req.method === 'POST') return send(res, 200, {});
  if (path === '/settings') return send(res, 200, { external: { email: true }, disable_signup: true });
  return send(res, 404, { code: 404, msg: 'Not found' });
}

// ---------------------------------------------------------------------------
// Request role (PostgREST semantics)
// ---------------------------------------------------------------------------
async function resolveContext(req) {
  const token = bearer(req) ?? req.headers.apikey;
  if (!token) return { role: 'anon', claims: { role: 'anon' } };
  let payload;
  try {
    ({ payload } = await jwtVerify(token, secret));
  } catch {
    throw new HttpError(401, { code: 'PGRST301', message: 'JWT expired or invalid' });
  }
  if (payload.role === 'service_role') return { role: 'service_role', claims: payload };
  if (payload.role === 'anon') return { role: 'anon', claims: payload };
  if (payload.role === 'authenticated' && sessions.has(payload.session_id)) return { role: 'authenticated', claims: payload };
  throw new HttpError(401, { code: 'PGRST301', message: 'JWT expired or invalid' });
}

// ---------------------------------------------------------------------------
// PostgREST subset
// ---------------------------------------------------------------------------
const RESERVED_PARAMS = new Set(['select', 'order', 'limit', 'offset', 'on_conflict', 'columns']);

function ident(name) {
  if (!/^[a-z_][a-z0-9_]*$/.test(name)) throw new HttpError(400, { code: 'PGRST100', message: `Unsupported identifier: ${name}` });
  return `"${name}"`;
}

function parseSelect(select) {
  if (!select || select === '*') return '*';
  return select
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      if (/[(:!.]/.test(part)) throw new HttpError(400, { code: 'PGRST100', message: `Mock does not support embeds/aliases: ${part}` });
      return ident(part);
    })
    .join(', ');
}

function splitList(value) {
  const items = [];
  let current = '';
  let quoted = false;
  for (const char of value) {
    if (char === '"') quoted = !quoted;
    else if (char === ',' && !quoted) {
      items.push(current);
      current = '';
    } else current += char;
  }
  if (current.length > 0 || value.endsWith(',')) items.push(current);
  return items;
}

function buildWhere(url, params) {
  const conditions = [];
  const param = (value) => {
    params.push(value);
    return `$${params.length}`;
  };
  for (const [key, raw] of url.searchParams) {
    if (RESERVED_PARAMS.has(key)) continue;
    const column = ident(key);
    let expression = raw;
    let negate = false;
    if (expression.startsWith('not.')) {
      negate = true;
      expression = expression.slice(4);
    }
    const dot = expression.indexOf('.');
    const operator = expression.slice(0, dot);
    const value = expression.slice(dot + 1);
    let condition;
    switch (operator) {
      case 'eq': condition = `${column} = ${param(value)}`; break;
      case 'neq': condition = `${column} <> ${param(value)}`; break;
      case 'gt': condition = `${column} > ${param(value)}`; break;
      case 'gte': condition = `${column} >= ${param(value)}`; break;
      case 'lt': condition = `${column} < ${param(value)}`; break;
      case 'lte': condition = `${column} <= ${param(value)}`; break;
      case 'like': condition = `${column}::text like ${param(value.replace(/\*/g, '%'))}`; break;
      case 'ilike': condition = `${column}::text ilike ${param(value.replace(/\*/g, '%'))}`; break;
      case 'is':
        if (value === 'null') condition = `${column} is null`;
        else if (value === 'true') condition = `${column} is true`;
        else if (value === 'false') condition = `${column} is false`;
        else throw new HttpError(400, { code: 'PGRST100', message: `Bad is value ${value}` });
        break;
      case 'in': {
        const list = splitList(value.replace(/^\(|\)$/g, ''));
        condition = list.length === 0 ? 'false' : `${column} in (${list.map((item) => param(item)).join(', ')})`;
        break;
      }
      default:
        throw new HttpError(400, { code: 'PGRST100', message: `Mock does not support operator ${operator}` });
    }
    conditions.push(negate ? `not (${condition})` : condition);
  }
  return conditions.length > 0 ? ` where ${conditions.join(' and ')}` : '';
}

function buildOrder(url) {
  const order = url.searchParams.get('order');
  if (!order) return '';
  const parts = order.split(',').map((item) => {
    const [column, direction = 'asc', nulls] = item.split('.');
    const dir = direction === 'desc' ? 'desc' : 'asc';
    const nullsSql = nulls === 'nullsfirst' ? ' nulls first' : nulls === 'nullslast' ? ' nulls last' : '';
    return `${ident(column)} ${dir}${nullsSql}`;
  });
  return ` order by ${parts.join(', ')}`;
}

function pgError(error, context) {
  const code = error.code ?? 'XX000';
  const status = code === '42501' ? (context.role === 'anon' ? 401 : 403) : ['23505', '23503'].includes(code) ? 409 : code.startsWith('P') ? 400 : 400;
  return new HttpError(status, { code, message: error.message, details: error.detail ?? null, hint: error.hint ?? null });
}

function wantsObject(req) {
  return (req.headers.accept ?? '').includes('application/vnd.pgrst.object+json');
}

function respondRows(req, res, rows, extraHeaders = {}) {
  if (wantsObject(req)) {
    if (rows.length !== 1) {
      return send(res, 406, { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned', details: `The result contains ${rows.length} rows`, hint: null });
    }
    return send(res, 200, rows[0], extraHeaders);
  }
  return send(res, 200, rows, extraHeaders);
}

const functionCache = new Map();
async function functionInfo(name) {
  if (functionCache.has(name)) return functionCache.get(name);
  const result = await exclusive(() =>
    db.query(
      `select p.proretset as retset, p.proargnames as argnames,
              array(select format_type(t, null) from unnest(p.proargtypes) as t) as argtypes,
              format_type(p.prorettype, null) as rettype
       from pg_proc p join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'public' and p.proname = $1`,
      [name],
    ),
  );
  const info = result.rows[0] ?? null;
  functionCache.set(name, info);
  return info;
}

function toPgArrayLiteral(values) {
  return `{${values.map((value) => (value === null ? 'NULL' : `"${String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`)).join(',')}}`;
}

async function handleRpc(req, res, url, context, name) {
  if (!/^[a-z_][a-z0-9_]*$/.test(name)) throw new HttpError(404, { code: 'PGRST202', message: 'Function not found' });
  const info = await functionInfo(name);
  if (!info) throw new HttpError(404, { code: 'PGRST202', message: `Could not find the function public.${name}` });
  const args = req.method === 'GET' || req.method === 'HEAD' ? Object.fromEntries(url.searchParams) : await readJson(req);

  const params = [];
  const named = Object.entries(args)
    .filter(([, value]) => value !== undefined)
    .map(([argName, value]) => {
      const index = (info.argnames ?? []).indexOf(argName);
      if (index < 0) throw new HttpError(404, { code: 'PGRST202', message: `Unknown argument ${argName}` });
      const type = info.argtypes[index];
      let pgValue = value;
      if (value === null) pgValue = null;
      else if (type.endsWith('[]')) pgValue = Array.isArray(value) ? toPgArrayLiteral(value) : String(value);
      else if (type === 'jsonb' || type === 'json') pgValue = typeof value === 'string' && req.method === 'GET' ? value : JSON.stringify(value);
      else pgValue = String(value);
      params.push(pgValue);
      return `${ident(argName)} => $${params.length}::${type}`;
    });

  const sql = info.retset
    ? `select * from public.${ident(name)}(${named.join(', ')})`
    : `select public.${ident(name)}(${named.join(', ')}) as result`;

  let result;
  try {
    result = await asRole(context, () => db.query(sql, params));
  } catch (error) {
    throw pgError(error, context);
  }
  if (info.retset) return respondRows(req, res, result.rows);
  return send(res, 200, JSON.stringify(result.rows[0]?.result ?? null));
}

async function handleRest(req, res, url) {
  const context = await resolveContext(req);
  const path = url.pathname.replace('/rest/v1/', '');
  if (path.startsWith('rpc/')) return handleRpc(req, res, url, context, path.slice(4));

  const table = path;
  const relation = `public.${ident(table)}`;
  const prefer = req.headers.prefer ?? '';
  const returning = prefer.includes('return=representation') ? ` returning ${parseSelect(url.searchParams.get('select'))}` : '';
  const params = [];

  try {
    if (req.method === 'GET' || req.method === 'HEAD') {
      const where = buildWhere(url, params);
      const limit = url.searchParams.get('limit');
      const offset = Number(url.searchParams.get('offset') ?? 0);
      const sql = `select ${parseSelect(url.searchParams.get('select'))} from ${relation}${where}${buildOrder(url)}${limit ? ` limit ${Number(limit)}` : ''}${offset ? ` offset ${offset}` : ''}`;
      const { rows, count } = await asRole(context, async () => {
        const data = req.method === 'HEAD' ? { rows: [] } : await db.query(sql, params);
        let total = null;
        if (prefer.includes('count=')) {
          const counted = await db.query(`select count(*)::int as count from ${relation}${where}`, params);
          total = counted.rows[0].count;
        }
        return { rows: data.rows, count: total };
      });
      const headers = count === null ? {} : { 'content-range': rows.length ? `${offset}-${offset + rows.length - 1}/${count}` : `*/${count}` };
      if (req.method === 'HEAD') return send(res, 200, undefined, headers);
      return respondRows(req, res, rows, headers);
    }

    if (req.method === 'POST') {
      const body = await readJson(req);
      const rows = Array.isArray(body) ? body : [body];
      const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))].map(ident);
      params.push(JSON.stringify(rows));
      const selectList = columns.join(', ');
      let conflict = '';
      if (prefer.includes('resolution=merge-duplicates')) {
        const keys = (url.searchParams.get('on_conflict') ?? 'id').split(',').map(ident);
        const updates = columns.filter((column) => !keys.includes(column)).map((column) => `${column} = excluded.${column}`);
        conflict = ` on conflict (${keys.join(', ')}) do ${updates.length ? `update set ${updates.join(', ')}` : 'nothing'}`;
      }
      const sql = `insert into ${relation} (${selectList}) select ${selectList} from jsonb_populate_recordset(null::${relation}, $1::jsonb)${conflict}${returning}`;
      const result = await asRole(context, () => db.query(sql, params));
      if (!returning) return send(res, 201);
      return respondRows(req, res, result.rows);
    }

    if (req.method === 'PATCH') {
      const body = await readJson(req);
      params.push(JSON.stringify(body));
      const sets = Object.keys(body).map((key) => `${ident(key)} = (select ${ident(key)} from jsonb_populate_record(null::${relation}, $1::jsonb))`);
      const where = buildWhere(url, params);
      const sql = `update ${relation} set ${sets.join(', ')}${where}${returning}`;
      const result = await asRole(context, () => db.query(sql, params));
      if (!returning) return send(res, 204);
      return respondRows(req, res, result.rows);
    }

    if (req.method === 'DELETE') {
      const where = buildWhere(url, params);
      const result = await asRole(context, () => db.query(`delete from ${relation}${where}${returning}`, params));
      if (!returning) return send(res, 204);
      return respondRows(req, res, result.rows);
    }
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw pgError(error, context);
  }
  return send(res, 405, { message: 'Method not allowed' });
}

// ---------------------------------------------------------------------------
// Storage subset (files on disk under .mock-supabase/storage)
// ---------------------------------------------------------------------------
async function bucketConfig(id) {
  const result = await exclusive(() => db.query('select id, public, file_size_limit, allowed_mime_types from storage.buckets where id = $1', [id]));
  return result.rows[0] ?? null;
}

function objectFile(bucket, objectPath) {
  const normalized = objectPath.split('/').filter(Boolean);
  if (normalized.some((segment) => segment === '..' || segment === '.')) throw new HttpError(400, { statusCode: '400', error: 'InvalidKey', message: 'Invalid key' });
  return join(storageDir, bucket, ...normalized);
}

function storageError(status, error, message) {
  return new HttpError(status, { statusCode: String(status), error, message });
}

async function requireService(req) {
  const context = await resolveContext(req).catch(() => ({ role: 'anon' }));
  if (context.role !== 'service_role') throw storageError(403, 'Unauthorized', 'new row violates row-level security policy');
}

async function writeObject(bucket, objectPath, data, contentType, upsert) {
  const config = await bucketConfig(bucket);
  if (!config) throw storageError(404, 'Bucket not found', 'Bucket not found');
  if (config.file_size_limit && data.length > Number(config.file_size_limit)) {
    throw storageError(413, 'Payload too large', 'The object exceeded the maximum allowed size');
  }
  const mime = (contentType ?? 'application/octet-stream').split(';')[0].trim();
  if (config.allowed_mime_types && !config.allowed_mime_types.includes(mime)) {
    throw storageError(415, 'invalid_mime_type', `mime type ${mime} is not supported`);
  }
  const file = objectFile(bucket, objectPath);
  if (existsSync(file) && !upsert) throw storageError(400, 'Duplicate', 'The resource already exists');
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, data);
  writeFileSync(`${file}.meta.json`, JSON.stringify({ contentType: mime, size: data.length, created: new Date().toISOString() }));
  return { Key: `${bucket}/${objectPath}`, Id: randomUUID() };
}

function serveFile(req, res, file, download) {
  if (!existsSync(file)) throw storageError(404, 'not_found', 'Object not found');
  const meta = JSON.parse(readFileSync(`${file}.meta.json`, 'utf8'));
  const size = statSync(file).size;
  const headers = {
    'content-type': meta.contentType,
    'accept-ranges': 'bytes',
    'cache-control': 'no-cache',
    ...(download !== null ? { 'content-disposition': `attachment; filename="${(download || file.split(/[\\/]/).pop()).replace(/"/g, '')}"` } : {}),
  };
  const range = req.headers.range;
  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (match) {
      let start = match[1] === '' ? Math.max(0, size - Number(match[2])) : Number(match[1]);
      let end = match[1] === '' ? size - 1 : match[2] === '' ? size - 1 : Math.min(Number(match[2]), size - 1);
      if (start > end) start = end;
      res.writeHead(206, { ...headers, 'content-range': `bytes ${start}-${end}/${size}`, 'content-length': end - start + 1 });
      createReadStream(file, { start, end }).pipe(res);
      return;
    }
  }
  res.writeHead(200, { ...headers, 'content-length': size });
  createReadStream(file).pipe(res);
}

async function handleStorage(req, res, url) {
  const path = decodeURIComponent(url.pathname.replace('/storage/v1', ''));

  // Signed upload: create and use
  let match = /^\/object\/upload\/sign\/([^/]+)\/(.+)$/.exec(path);
  if (match) {
    const [, bucket, objectPath] = match;
    if (req.method === 'POST') {
      await requireService(req);
      const token = await sign({ url: `${bucket}/${objectPath}`, kind: 'upload', upsert: req.headers['x-upsert'] === 'true' }, 7200);
      return send(res, 200, { url: `/object/upload/sign/${bucket}/${objectPath}?token=${token}` });
    }
    if (req.method === 'PUT') {
      let payload;
      try {
        ({ payload } = await jwtVerify(url.searchParams.get('token') ?? '', secret));
      } catch {
        throw storageError(400, 'InvalidJWT', 'jwt expired or invalid');
      }
      if (payload.kind !== 'upload' || payload.url !== `${bucket}/${objectPath}`) throw storageError(400, 'InvalidSignature', 'The url do not match the signature');
      const data = await readBody(req);
      return send(res, 200, await writeObject(bucket, objectPath, data, req.headers['content-type'], payload.upsert === true));
    }
  }

  // Signed download: create and use
  match = /^\/object\/sign\/([^/]+)\/(.+)$/.exec(path);
  if (match) {
    const [, bucket, objectPath] = match;
    if (req.method === 'POST') {
      await requireService(req);
      const body = await readJson(req);
      const token = await sign({ url: `${bucket}/${objectPath}`, kind: 'download' }, Number(body.expiresIn ?? 60));
      return send(res, 200, { signedURL: `/object/sign/${bucket}/${objectPath}?token=${token}` });
    }
    if (req.method === 'GET' || req.method === 'HEAD') {
      let payload;
      try {
        ({ payload } = await jwtVerify(url.searchParams.get('token') ?? '', secret));
      } catch (error) {
        const expired = error?.code === 'ERR_JWT_EXPIRED';
        throw storageError(400, 'InvalidJWT', expired ? '"exp" claim timestamp check failed' : 'invalid signature');
      }
      if (payload.kind !== 'download' || payload.url !== `${bucket}/${objectPath}`) throw storageError(400, 'InvalidSignature', 'The url do not match the signature');
      return serveFile(req, res, objectFile(bucket, objectPath), url.searchParams.has('download') ? url.searchParams.get('download') : null);
    }
  }

  match = /^\/object\/public\/([^/]+)\/(.+)$/.exec(path);
  if (match && (req.method === 'GET' || req.method === 'HEAD')) {
    const [, bucket, objectPath] = match;
    const config = await bucketConfig(bucket);
    if (!config?.public) throw storageError(400, 'not_found', 'Bucket not found or not public');
    return serveFile(req, res, objectFile(bucket, objectPath), null);
  }

  match = /^\/object\/info\/([^/]+)\/(.+)$/.exec(path);
  if (match && req.method === 'GET') {
    await requireService(req);
    const [, bucket, objectPath] = match;
    const file = objectFile(bucket, objectPath);
    if (!existsSync(file)) throw storageError(404, 'not_found', 'Object not found');
    const meta = JSON.parse(readFileSync(`${file}.meta.json`, 'utf8'));
    return send(res, 200, {
      id: createHash('sha1').update(file).digest('hex'),
      name: objectPath,
      bucket_id: bucket,
      size: meta.size,
      content_type: meta.contentType,
      created_at: meta.created,
      last_modified: meta.created,
      metadata: {},
    });
  }

  match = /^\/object\/([^/]+)$/.exec(path);
  if (match && req.method === 'DELETE') {
    await requireService(req);
    const [, bucket] = match;
    const body = await readJson(req);
    const removed = [];
    for (const prefix of body.prefixes ?? []) {
      const file = objectFile(bucket, prefix);
      if (existsSync(file)) {
        rmSync(file);
        rmSync(`${file}.meta.json`, { force: true });
        removed.push({ name: prefix, bucket_id: bucket });
      }
    }
    return send(res, 200, removed);
  }

  match = /^\/object\/([^/]+)\/(.+)$/.exec(path);
  if (match && (req.method === 'POST' || req.method === 'PUT')) {
    await requireService(req);
    const [, bucket, objectPath] = match;
    const data = await readBody(req);
    return send(res, 200, await writeObject(bucket, objectPath, data, req.headers['content-type'], req.method === 'PUT' || req.headers['x-upsert'] === 'true'));
  }

  throw storageError(404, 'not_found', `Unsupported storage route ${req.method} ${path}`);
}

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------
const server = http.createServer(async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return send(res, 204);
  const url = new URL(req.url ?? '/', MOCK_URL);
  try {
    if (url.pathname.startsWith('/auth/v1/')) return await handleAuth(req, res, url);
    if (url.pathname.startsWith('/rest/v1/')) return await handleRest(req, res, url);
    if (url.pathname.startsWith('/storage/v1/')) return await handleStorage(req, res, url);
    if (url.pathname === '/health') return send(res, 200, { ok: true });
    return send(res, 404, { message: 'Not found' });
  } catch (error) {
    if (error instanceof HttpError) {
      if (error.status >= 500 || process.env.MOCK_VERBOSE) log(req.method, url.pathname, error.status, error.body?.message);
      return send(res, error.status, error.body);
    }
    log('Unhandled error', req.method, url.pathname, error);
    return send(res, 500, { message: error.message });
  }
});

mkdirSync(storageDir, { recursive: true });
writeFileSync(
  join(stateDir, 'env'),
  [
    `NEXT_PUBLIC_SUPABASE_URL=${MOCK_URL}`,
    `NEXT_PUBLIC_SUPABASE_ANON_KEY=${anonKey}`,
    `SUPABASE_SERVICE_ROLE_KEY=${serviceKey}`,
    'NEXT_PUBLIC_SITE_URL=http://localhost:3000',
    '',
  ].join('\n'),
);

server.listen(MOCK_PORT, '127.0.0.1', () => {
  log(`listening on ${MOCK_URL} (env written to .mock-supabase/env)`);
});
