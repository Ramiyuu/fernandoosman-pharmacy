import 'server-only';

import { z } from 'zod';

import { publicEnv } from './public-env';

const optional = <T extends z.ZodType>(schema: T) => schema.optional().or(z.literal('').transform(() => undefined));

const serverSchema = z.object({
  DATABASE_URL: z
    .string()
    .regex(/^postgres(ql)?:\/\//, 'DATABASE_URL must be a postgres:// connection string'),
  DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(50).default(10),
  BETTER_AUTH_SECRET: z.string().min(32, 'BETTER_AUTH_SECRET must have at least 32 characters'),
  R2_ACCOUNT_ID: z.string().regex(/^[a-f0-9]{32}$/i, 'R2_ACCOUNT_ID must be the 32-character Cloudflare account id'),
  R2_ACCESS_KEY_ID: z.string().min(16),
  R2_SECRET_ACCESS_KEY: z.string().min(32),
  R2_BUCKET: z.string().regex(/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/, 'R2_BUCKET must be a valid bucket name'),
  /** Only for local development and tests (an S3-compatible endpoint). */
  R2_ENDPOINT: optional(z.url()),
  /** Header carrying the real client IP, set by the platform in front of the site. */
  TRUSTED_IP_HEADER: optional(z.string().regex(/^[a-z0-9-]{1,64}$/i)),
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
    DATABASE_URL: process.env.DATABASE_URL,
    DATABASE_POOL_MAX: process.env.DATABASE_POOL_MAX || undefined,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID,
    R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
    R2_BUCKET: process.env.R2_BUCKET,
    R2_ENDPOINT: process.env.R2_ENDPOINT,
    TRUSTED_IP_HEADER: process.env.TRUSTED_IP_HEADER,
  });
  if (!parsed.success) {
    // Report which variables are wrong, never their values.
    const fields = [...new Set(parsed.error.issues.map((issue) => issue.path.join('.')))].join(', ');
    throw new Error(`Invalid server environment: ${fields}. See .env.example.`);
  }
  cached = parsed.data;
  return cached;
}

export { publicEnv };
