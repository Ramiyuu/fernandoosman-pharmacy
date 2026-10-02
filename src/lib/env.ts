import 'server-only';

import { z } from 'zod';

import { publicEnv } from './public-env';

const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20, 'SUPABASE_SERVICE_ROLE_KEY is missing'),
  UPSTASH_REDIS_REST_URL: z.url().optional().or(z.literal('')),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  AUTH_MAGIC_LINK_ENABLED: z.enum(['true', 'false']).optional(),
});

type ServerEnv = z.infer<typeof serverSchema>;

let cached: ServerEnv | null = null;

/**
 * Server-only environment. Read lazily so that pages that never need secrets
 * (and `next build` without secrets) do not fail; operations that need them
 * fail loudly with a clear message instead of silently degrading.
 */
export function serverEnv(): ServerEnv {
  if (cached) return cached;
  const parsed = serverSchema.safeParse({
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
    AUTH_MAGIC_LINK_ENABLED: process.env.AUTH_MAGIC_LINK_ENABLED || undefined,
  });
  if (!parsed.success) {
    // Report which variables are wrong, never their values.
    const fields = parsed.error.issues.map((issue) => issue.path.join('.')).join(', ');
    throw new Error(`Invalid server environment: ${fields}`);
  }
  cached = parsed.data;
  return cached;
}

export function isMagicLinkEnabled(): boolean {
  return process.env.AUTH_MAGIC_LINK_ENABLED === 'true';
}

export { publicEnv };
