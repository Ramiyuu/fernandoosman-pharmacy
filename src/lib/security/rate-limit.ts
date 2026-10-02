import 'server-only';

import { createHmac } from 'node:crypto';

import { serverDb } from '@/lib/db/client';
import { sql } from '@/lib/db/sql';
import { createLogger, describeError } from '@/lib/logger';

const log = createLogger('rate-limit');

interface Rule {
  limit: number;
  windowSeconds: number;
}

export const RATE_LIMITS = {
  /** Password sign-in attempts per client IP. */
  login: { limit: 10, windowSeconds: 10 * 60 },
  /** Password sign-in attempts per account (e-mail), across IPs. */
  loginAccount: { limit: 5, windowSeconds: 15 * 60 },
  /** Two-factor code attempts per client IP (Better Auth also locks the account after 10 failures). */
  twoFactor: { limit: 10, windowSeconds: 10 * 60 },
  upload: { limit: 40, windowSeconds: 10 * 60 },
  contact: { limit: 3, windowSeconds: 10 * 60 },
  fileDownload: { limit: 60, windowSeconds: 60 },
} as const satisfies Record<string, Rule>;

export type RateLimitRule = keyof typeof RATE_LIMITS;

export interface RateLimitOutcome {
  success: boolean;
  retryAfterSeconds: number;
}

/**
 * Pseudonymises identifiers (IP addresses, e-mail addresses) with a keyed
 * hash before they are stored, so the rate-limit table holds no personal data
 * in clear text (LGPD) and the values cannot be brute-forced without the
 * server secret.
 */
function pseudonymize(value: string): string {
  const secret = process.env.BETTER_AUTH_SECRET ?? 'development-only-secret';
  return createHmac('sha256', `rate-limit:${secret}`).update(value.trim().toLowerCase()).digest('base64url').slice(0, 32);
}

// In-memory fallback, used only if the database is unreachable.
const memory = new Map<string, { count: number; resetAt: number }>();

function memoryLimit(key: string, rule: Rule): RateLimitOutcome {
  const now = Date.now();
  if (memory.size > 10_000) {
    for (const [storedKey, entry] of memory) if (entry.resetAt <= now) memory.delete(storedKey);
  }
  const entry = memory.get(key);
  if (!entry || entry.resetAt <= now) {
    memory.set(key, { count: 1, resetAt: now + rule.windowSeconds * 1000 });
    return { success: true, retryAfterSeconds: 0 };
  }
  entry.count += 1;
  const success = entry.count <= rule.limit;
  return { success, retryAfterSeconds: success ? 0 : Math.ceil((entry.resetAt - now) / 1000) };
}

/**
 * Fixed-window rate limiting stored in Postgres (shared by every instance and
 * kept across restarts). Falls back to memory if the database is down, rather
 * than locking the admin out.
 */
export async function rateLimit(rule: RateLimitRule, identifier: string): Promise<RateLimitOutcome> {
  const { limit, windowSeconds } = RATE_LIMITS[rule];
  const key = `${rule}:${pseudonymize(identifier)}`;
  try {
    const row = await serverDb().one<{ allowed: boolean; retry_after_seconds: number }>(
      sql`select allowed, retry_after_seconds from private.consume_rate_limit(${key}, ${limit}, ${windowSeconds})`,
    );
    return { success: row.allowed, retryAfterSeconds: row.retry_after_seconds };
  } catch (error) {
    log.error('Rate limiter unavailable, using memory', { error: describeError(error) });
    return memoryLimit(key, RATE_LIMITS[rule]);
  }
}
