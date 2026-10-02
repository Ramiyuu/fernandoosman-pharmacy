import 'server-only';

import { createHash } from 'node:crypto';

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

import { createLogger } from '@/lib/logger';

const log = createLogger('rate-limit');

type Unit = 's' | 'm' | 'h';
type Window = `${number} ${Unit}`;

interface Rule {
  limit: number;
  window: Window;
}

export const RATE_LIMITS = {
  /** Password sign-in attempts per client IP. */
  login: { limit: 10, window: '10 m' },
  /** Password sign-in attempts per account (hashed email), across IPs. */
  loginAccount: { limit: 5, window: '15 m' },
  magicLink: { limit: 3, window: '15 m' },
  upload: { limit: 40, window: '10 m' },
  contact: { limit: 3, window: '10 m' },
  fileDownload: { limit: 60, window: '1 m' },
} as const satisfies Record<string, Rule>;

export type RateLimitRule = keyof typeof RATE_LIMITS;

export interface RateLimitOutcome {
  success: boolean;
  retryAfterSeconds: number;
}

function windowToMs(window: Window): number {
  const [amount, unit] = window.split(' ') as [string, Unit];
  const factor = unit === 's' ? 1000 : unit === 'm' ? 60_000 : 3_600_000;
  return Number(amount) * factor;
}

// -----------------------------------------------------------------------------
// Upstash Redis (shared across instances) — used when configured.
// -----------------------------------------------------------------------------
let redis: Redis | null | undefined;
const upstashLimiters = new Map<RateLimitRule, Ratelimit>();

function getRedis(): Redis | null {
  if (redis !== undefined) return redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  redis = url && token ? new Redis({ url, token }) : null;
  if (!redis && process.env.NODE_ENV === 'production') {
    log.warn('UPSTASH_REDIS_REST_URL/TOKEN not set: using per-instance in-memory rate limiting');
  }
  return redis;
}

function getUpstashLimiter(rule: RateLimitRule, client: Redis): Ratelimit {
  const existing = upstashLimiters.get(rule);
  if (existing) return existing;
  const { limit, window } = RATE_LIMITS[rule];
  const limiter = new Ratelimit({
    redis: client,
    limiter: Ratelimit.slidingWindow(limit, window),
    prefix: `rl:${rule}`,
    analytics: false,
  });
  upstashLimiters.set(rule, limiter);
  return limiter;
}

// -----------------------------------------------------------------------------
// In-memory fixed window — fallback for local development / single instance.
// -----------------------------------------------------------------------------
const memory = new Map<string, { count: number; resetAt: number }>();
const MEMORY_MAX_KEYS = 10_000;

function memoryLimit(rule: RateLimitRule, identifier: string): RateLimitOutcome {
  const { limit, window } = RATE_LIMITS[rule];
  const key = `${rule}:${identifier}`;
  const now = Date.now();

  if (memory.size > MEMORY_MAX_KEYS) {
    for (const [storedKey, entry] of memory) {
      if (entry.resetAt <= now) memory.delete(storedKey);
    }
  }

  const entry = memory.get(key);
  if (!entry || entry.resetAt <= now) {
    memory.set(key, { count: 1, resetAt: now + windowToMs(window) });
    return { success: true, retryAfterSeconds: 0 };
  }
  entry.count += 1;
  const success = entry.count <= limit;
  return { success, retryAfterSeconds: success ? 0 : Math.ceil((entry.resetAt - now) / 1000) };
}

/** Hashes identifiers such as e-mail addresses so they are never stored in clear text. */
export function hashIdentifier(value: string): string {
  return createHash('sha256').update(value.trim().toLowerCase()).digest('hex').slice(0, 32);
}

export async function rateLimit(rule: RateLimitRule, identifier: string): Promise<RateLimitOutcome> {
  const client = getRedis();
  if (!client) return memoryLimit(rule, identifier);

  try {
    const result = await getUpstashLimiter(rule, client).limit(identifier);
    return {
      success: result.success,
      retryAfterSeconds: result.success ? 0 : Math.max(1, Math.ceil((result.reset - Date.now()) / 1000)),
    };
  } catch (error) {
    // Fail closed would lock the admin out during a Redis outage; fall back to memory instead.
    log.error('Upstash rate limiter unavailable, falling back to memory', { error });
    return memoryLimit(rule, identifier);
  }
}

export function rateLimitBackend(): 'upstash' | 'memory' {
  return getRedis() ? 'upstash' : 'memory';
}
