import 'server-only';

import pg from 'pg';

import { serverEnv } from '@/lib/env';
import { createLogger, describeError } from '@/lib/logger';

const log = createLogger('db');

// One pool per server process (kept on globalThis so dev hot reloads reuse it).
const globalForDb = globalThis as typeof globalThis & { __portfolioPool?: pg.Pool };

/**
 * Connection pool for the website's login role (DATABASE_URL). Every new
 * connection immediately drops to `web_server`, so even a misconfigured
 * DATABASE_URL that points at the owner account cannot alter the schema or
 * bypass Row Level Security from the website. Content queries then switch to
 * web_anon / web_admin per transaction (src/lib/db/client.ts).
 */
export function getPool(): pg.Pool {
  if (globalForDb.__portfolioPool) return globalForDb.__portfolioPool;

  const env = serverEnv();
  const pool = new pg.Pool({
    connectionString: env.DATABASE_URL,
    max: env.DATABASE_POOL_MAX,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    application_name: 'portfolio-web',
  });
  pool.on('connect', (client) => {
    // Queued before any other query on this connection.
    client.query('set role web_server').catch((error: unknown) => {
      log.error('Could not switch the connection to web_server (run npm run db:migrate)', { error: describeError(error) });
    });
  });
  pool.on('error', (error) => log.error('Idle database connection failed', { error: describeError(error) }));

  globalForDb.__portfolioPool = pool;
  return pool;
}
